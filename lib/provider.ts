import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

// "compatible" is any OpenAI-compatible endpoint set with LLM_BASE_URL
// (Vikey, OpenRouter, DeepSeek, a local server, ...).
export type ProviderName =
  | "gemini"
  | "anthropic"
  | "openai"
  | "groq"
  | "compatible";

const DEFAULT_MODELS: Record<ProviderName, string> = {
  gemini: "gemini-3.5-flash-lite",
  anthropic: "claude-haiku-5-5",
  openai: "gpt-4.1-mini",
  groq: "llama-3.1-8b-instant",
  compatible: "",
};

export type ResolvedProvider = {
  name: ProviderName;
  modelId: string;
  apiKey: string;
  baseURL?: string;
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
  const generic = firstSet(["LLM_API_KEY"]);
  switch (name) {
    case "gemini":
      return firstSet(["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) ?? generic;
    case "anthropic":
      return firstSet(["ANTHROPIC_API_KEY"]) ?? generic;
    case "openai":
      return firstSet(["OPENAI_API_KEY"]) ?? generic;
    case "groq":
      return firstSet(["GROQ_API_KEY"]) ?? generic;
    case "compatible":
      return generic;
  }
}

/** Null when the chosen provider has no key. The route then uses the canned FAQ. */
export function resolveProvider(): ResolvedProvider | null {
  const raw = (process.env.LLM_PROVIDER || "gemini").trim().toLowerCase();
  const baseURL = process.env.LLM_BASE_URL?.trim().replace(/\/$/, "");
  // A base URL means an OpenAI-compatible endpoint, whatever LLM_PROVIDER says.
  const name = baseURL ? "compatible" : alias(raw);
  if (!name) return null;
  const apiKey = keyFor(name);
  if (!apiKey) return null;
  const modelId = process.env.LLM_MODEL?.trim() || DEFAULT_MODELS[name];
  if (!modelId) return null;
  return { name, modelId, apiKey, ...(baseURL ? { baseURL } : {}) };
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
    case "compatible":
      // Third-party endpoints speak Chat Completions, not the Responses API.
      return createOpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL }).chat(
        cfg.modelId,
      );
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
    // Gemini and Claude spend tokens on hidden reasoning unless this is off.
    // Groq and unknown compatible endpoints may reject the field, so leave it unset there.
    ...(provider.name === "groq" || provider.name === "compatible"
      ? {}
      : { reasoning: "none" as const }),
    maxRetries: 0,
    timeout: 20_000,
    abortSignal,
    onError({ error }) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[puma]", redact(message, provider.apiKey));
    },
  });
}
