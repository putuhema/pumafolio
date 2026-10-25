import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

export type ProviderName = "gemini" | "anthropic" | "openai" | "groq";

const DEFAULT_MODELS: Record<ProviderName, string> = {
  gemini: "gemini-3.5-flash-lite",
  anthropic: "claude-haiku-5-5",
  openai: "gpt-4.1-mini",
  groq: "llama-3.1-8b-instant",
};

export type ResolvedProvider = {
  name: ProviderName;
  modelId: string;
  apiKey: string;
};

function alias(raw: string): ProviderName | null {
  switch (raw) {
    case "gemini":
    case "google":
      return "gemini";
    case "anthropic":
    case "claude":
      return "anthropic";
    case "openai":
      return "openai";
    case "groq":
      return "groq";
    default:
      return null;
  }
}

function firstSet(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function keyFor(name: ProviderName) {
  switch (name) {
    case "gemini":
      return firstSet(["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]);
    case "anthropic":
      return firstSet(["ANTHROPIC_API_KEY"]);
    case "openai":
      return firstSet(["OPENAI_API_KEY"]);
    case "groq":
      return firstSet(["GROQ_API_KEY"]);
  }
}

/** Null when the chosen provider has no key. The route then uses the canned FAQ. */
export function resolveProvider(): ResolvedProvider | null {
  const raw = (process.env.LLM_PROVIDER || "gemini").trim().toLowerCase();
  const name = alias(raw);
  if (!name) return null;
  const apiKey = keyFor(name);
  if (!apiKey) return null;
  const modelId = process.env.LLM_MODEL?.trim() || DEFAULT_MODELS[name];
  return { name, modelId, apiKey };
}

export function defaultModel(name: ProviderName) {
  return DEFAULT_MODELS[name];
}

function modelFor(cfg: ResolvedProvider) {
  switch (cfg.name) {
    case "gemini":
      return createGoogle({ apiKey: cfg.apiKey })(cfg.modelId);
    case "anthropic":
      return createAnthropic({ apiKey: cfg.apiKey })(cfg.modelId);
    case "openai":
      return createOpenAI({ apiKey: cfg.apiKey })(cfg.modelId);
    case "groq":
      return createGroq({ apiKey: cfg.apiKey })(cfg.modelId);
  }
}

export function redact(value: string, secret: string) {
  if (!secret) return value;
  return value.split(secret).join("[redacted]");
}

export function streamModel(options: {
  provider: ResolvedProvider;
  system: string;
  messages: ModelMessage[];
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
}) {
  const { provider, system, messages, maxOutputTokens, abortSignal } = options;
  return streamText({
    model: modelFor(provider),
    system,
    messages,
    maxOutputTokens,
    // Skip temperature on Claude: Haiku 5.5 can reject sampling params while thinking.
    temperature: provider.name === "anthropic" ? undefined : 0.3,
    // Cheapest reasoning setting the provider will accept (off, or minimum).
    reasoning: "none",
    maxRetries: 0,
    timeout: 20_000,
    abortSignal,
    onError({ error }) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[puma]", redact(message, provider.apiKey));
    },
  });
}
