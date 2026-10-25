import { answerQuestion } from "./canned";
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
import { checkRateLimit, clientIp } from "./rate-limit";

const BUSY =
  "Puma couldn't reach the model. Try again in a bit.";

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

  const limit = checkRateLimit(clientIp(request));
  if (!limit.ok) {
    return json(
      429,
      "That's enough questions for this hour. Come back later.",
      { "Retry-After": String(limit.retryAfterSec) },
    );
  }

  const provider = resolveProvider();
  if (!provider) {
    const last = parsed.messages[parsed.messages.length - 1]!;
    const answer = answerQuestion(last.content);
    return streamPlain(
      answer.text,
      {
        "X-Puma-Source": "canned",
        "X-Puma-Mood": answer.mood,
      },
      request.signal,
    );
  }

  try {
    const result = streamModel({
      provider,
      system: systemPrompt(),
      messages: parsed.messages,
      maxOutputTokens: maxOutputTokens(),
      abortSignal: request.signal,
    });

    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "X-Puma-Source": "model",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[puma]", redact(message, provider.apiKey));
    return json(502, BUSY);
  }
}
