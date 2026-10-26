import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { DECLINE, answerQuestion } from "./canned";
import { handleChat } from "./chat-handler";
import { sanitizeMessages } from "./messages";
import { defaultModel, redact, resolveProvider } from "./provider";
import { checkRateLimit, resetRateLimit } from "./rate-limit";
import { site } from "./site";

const SECRET_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "LLM_PROVIDER",
  "LLM_MODEL",
  "LLM_BASE_URL",
  "LLM_API_KEY",
  "CHAT_THINK_DELAY_MS",
  "CHAT_TOKEN_DELAY_MS",
  "CHAT_RATE_LIMIT",
  "CHAT_RATE_WINDOW_MS",
] as const;

const saved: Record<string, string | undefined> = {};

function stashEnv() {
  for (const name of SECRET_NAMES) saved[name] = process.env[name];
}

function clearKeys() {
  for (const name of SECRET_NAMES) delete process.env[name];
}

function restoreEnv() {
  for (const name of SECRET_NAMES) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
}

describe("site config", () => {
  it("keeps unknown links as TODOs and does not publish a phone", () => {
    assert.equal(site.cv.href, null);
    assert.equal(site.work.find((item) => item.slug === "simha")?.href, "https://github.com/putuhema/simha");
    assert.equal(site.work.find((item) => item.slug === "rsud-hadir")?.href, null);
    assert.equal(site.work.find((item) => item.slug === "kasirku")?.href, null);
    assert.equal("phone" in site, false);
    assert.equal(site.email, "putuhendramahendra@gmail.com");
  });
});

describe("knowledge", () => {
  const about = readFileSync(new URL("../content/about.md", import.meta.url), "utf8");
  const source = [
    about,
    readFileSync(new URL("./site.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./canned.ts", import.meta.url), "utf8"),
  ].join("\n");

  it("has no phone number and no whatsapp", () => {
    assert.doesNotMatch(source, /whatsapp/i);
    assert.doesNotMatch(source, /\d{8,}/);
    assert.match(about, /phone number is not public/i);
    assert.match(about, /Simha/);
    assert.match(about, /do not guess/i);
  });
});

describe("canned answers", () => {
  it("answers simha from the cv and declines unrelated questions", () => {
    const simha = answerQuestion("what is simha?");
    assert.match(simha.text, /read-only/);
    assert.match(simha.text, /https:\/\/github.com\/putuhema\/simha/);
    assert.equal(simha.mood, "idea");
    assert.doesNotMatch(simha.text, /\d{8,}/);

    const remote = answerQuestion("is putu open to remote work?");
    assert.match(remote.text, /open to remote/);
    assert.match(remote.text, /Mamuju/);

    assert.equal(answerQuestion("what's the weather in paris tomorrow?").text, DECLINE);
    assert.equal(answerQuestion("write a python fibonacci function").text, DECLINE);
    assert.equal(answerQuestion("tell me a joke").mood, "idle");
  });
});

describe("rate limit", () => {
  afterEach(() => resetRateLimit());

  it("allows 10 messages an hour and blocks the 11th", () => {
    const start = Date.parse("2026-10-25T00:00:00Z");
    for (let i = 0; i < 10; i++) {
      assert.equal(checkRateLimit("203.0.113.8", start + i).ok, true);
    }
    const blocked = checkRateLimit("203.0.113.8", start + 10);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSec > 0);
    assert.equal(checkRateLimit("203.0.113.9", start).ok, true);
  });
});

describe("messages", () => {
  it("rejects a too-long question and keeps a short history", () => {
    const long = sanitizeMessages(
      { messages: [{ role: "user", content: "a".repeat(501) }] },
      500,
      6,
    );
    assert.equal(long.ok, false);

    const ok = sanitizeMessages(
      {
        messages: [
          { role: "user", content: "old" },
          { role: "assistant", content: "older" },
          { role: "user", content: "what is simha?" },
        ],
      },
      500,
      2,
    );
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.messages.length, 2);
      assert.equal(ok.messages.at(-1)?.content, "what is simha?");
    }
  });
});

describe("provider", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("stays canned without a key and resolves a model when a key is set", () => {
    stashEnv();
    clearKeys();
    assert.equal(resolveProvider(), null);

    process.env.LLM_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-secret";
    const resolved = resolveProvider();
    assert.equal(resolved?.name, "anthropic");
    assert.equal(resolved?.modelId, defaultModel("anthropic"));
    assert.equal(resolved?.modelId, "claude-haiku-5-5");
    assert.equal(
      redact("key sk-ant-test-secret leaked", "sk-ant-test-secret").includes(
        "sk-ant-test-secret",
      ),
      false,
    );

    delete process.env.ANTHROPIC_API_KEY;
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test";
    process.env.LLM_MODEL = "gemini-3.1-flash-lite";
    assert.equal(resolveProvider()?.modelId, "gemini-3.1-flash-lite");

    process.env.LLM_PROVIDER = "nope";
    assert.equal(resolveProvider(), null);

    process.env.LLM_PROVIDER = "vikey";
    process.env.LLM_BASE_URL = "https://api.example.test/v1/";
    process.env.LLM_API_KEY = "vk-test";
    process.env.LLM_MODEL = "deepseek/deepseek-v4.1-flash";
    const compatible = resolveProvider();
    assert.equal(compatible?.name, "compatible");
    assert.equal(compatible?.baseURL, "https://api.example.test/v1");
    assert.equal(compatible?.apiKey, "vk-test");
    assert.equal(compatible?.modelId, "deepseek/deepseek-v4.1-flash");
  });
});

describe("chat route", () => {
  afterEach(() => {
    restoreEnv();
    resetRateLimit();
  });

  it("streams a canned answer and does not echo a key", async () => {
    stashEnv();
    clearKeys();
    process.env.CHAT_THINK_DELAY_MS = "0";
    process.env.CHAT_TOKEN_DELAY_MS = "0";
    process.env.GEMINI_API_KEY = "";

    const res = await handleChat(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.20",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "what is simha?" }],
        }),
      }),
    );

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-puma-source"), "canned");
    const text = await res.text();
    assert.match(text, /Simha/);
    assert.doesNotMatch(text, /GEMINI_API_KEY|sk-ant|api[_-]?key/i);
  });

  it("streams a provider response and keeps the key off the wire to the browser", async () => {
    stashEnv();
    clearKeys();
    resetRateLimit();
    process.env.LLM_PROVIDER = "groq";
    process.env.LLM_MODEL = "llama-3.1-8b-instant";
    process.env.GROQ_API_KEY = "gsk-test-secret-value";

    const original = globalThis.fetch;
    let seenAuth = "";
    globalThis.fetch = async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      assert.match(url, /api\.groq\.com\/openai\/v1\/chat\/completions/);
      const headers = new Headers(
        input instanceof Request ? input.headers : init?.headers,
      );
      seenAuth = headers.get("authorization") ?? "";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"index":0,"delta":{"content":"Putu built Simha for hospital data."}}]}\n\n',
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    };

    try {
      const res = await handleChat(
        new Request("http://localhost/api/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "198.51.100.21",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: "what is simha?" }],
          }),
        }),
      );
      const text = await res.text();
      assert.equal(res.status, 200, text);
      assert.equal(res.headers.get("x-puma-source"), "model");
      assert.match(text, /Simha/);
      assert.match(seenAuth, /gsk-test-secret-value/);
      assert.doesNotMatch(text, /gsk-test-secret-value/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
