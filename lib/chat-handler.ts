import { answerQuestion, DECLINE } from "./canned";
import { checkInput, checkOutput } from "./guard";
import { systemPrompt } from "./knowledge";
import {
  historyLimit,
  maxInputChars,
  maxOutputTokens,
  thinkDelayMs,
  tokenDelayMs,
} from "./limits";
import { sanitizeMessages } from "./messages";
import { redact, resolveProvider, streamModel } from "./provider";
import {
  checkRateLimit,
  clientIp,
  recordStrike,
  takeModelBudget,
} from "./rate-limit";

const BUSY =
  "Puma couldn't reach the model. Try again in a bit.";

const TIMED_OUT =
  "Puma only answers questions about Putu. Try again later.";

function json(status: number, error: string, extra?: HeadersInit) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...Object.fromEntries(new Headers(extra).entries()),
      },
    },
  );
}

function sleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function streamPlain(
  text: string,
  headers: HeadersInit,
  signal?: AbortSignal,
) {
  const encoder = new TextEncoder();
  const parts = text.split(/(\s+)/);
  const think = thinkDelayMs();
  const gap = tokenDelayMs();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await sleep(think, signal);
        for (const part of parts) {
          if (signal?.aborted) break;
          controller.enqueue(encoder.encode(part));
          if (gap && part.trim()) await sleep(gap, signal);
        }
        controller.close();
      } catch {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      ...Object.fromEntries(new Headers(headers).entries()),
    },
  });
}

export async function handleChat(request: Request) {
  if (request.method !== "POST") {
    return json(405, "Use POST.");
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 20_000) {
      return json(413, "That request is too large.");
    }
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return json(400, "Bad request.");
  }

  const parsed = sanitizeMessages(payload, maxInputChars(), historyLimit());
  if (!parsed.ok) return json(parsed.status, parsed.error);

  const ip = clientIp(request);
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    const message =
      limit.reason === "blocked"
        ? TIMED_OUT
        : limit.reason === "burst"
          ? "Slow down a little. Try again in a minute."
          : "That's enough questions for now. Come back later.";
    return json(429, message, { "Retry-After": String(limit.retryAfterSec) });
  }

  const decline = (source: string) => {
    const timedOut = recordStrike(ip);
    return streamPlain(
      timedOut ? TIMED_OUT : DECLINE,
      { "X-Puma-Source": source, "X-Puma-Mood": "idle" },
      request.signal,
    );
  };

  // Tricks and off-topic jobs stop here, before any model call.
  const input = checkInput(parsed.messages);
  if (!input.ok) return decline(`guard-${input.reason}`);

  const provider = resolveProvider();
  if (!provider || !takeModelBudget()) {
    const last = parsed.messages[parsed.messages.length - 1]!;
    const answer = answerQuestion(last.content);
    if (answer.text === DECLINE) return decline("canned");
    return streamPlain(
      answer.text,
      {
        "X-Puma-Source": "canned",
        "X-Puma-Mood": answer.mood,
      },
      request.signal,
    );
  }

  let reply = "";
  try {
    const result = streamModel({
      provider,
      system: systemPrompt(),
      messages: parsed.messages,
      maxOutputTokens: maxOutputTokens(),
      abortSignal: request.signal,
    });

    // Read the whole reply first so it can be checked before the visitor sees it.
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") reply += part.text;
      else if (part.type === "error") throw part.error;
    }
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const message = error instanceof Error ? error.message : String(error);
    console.error("[puma]", redact(message, provider.apiKey));
    return json(502, BUSY);
  }

  const output = checkOutput(reply);
  if (!output.ok) {
    if (output.reason === "leak") {
      console.warn("[puma] blocked a reply that looked like a prompt leak");
    }
    return decline(`model-${output.reason}`);
  }

  return streamPlain(
    reply.trim(),
    { "X-Puma-Source": "model", "X-Puma-Mood": "idea" },
    request.signal,
  );
}
