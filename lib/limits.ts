function intFromEnv(name: string, fallback: number, allowZero = false) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) return fallback;
  return Math.floor(n);
}

/** Max characters in the latest user message. */
export function maxInputChars() {
  return intFromEnv("CHAT_MAX_INPUT_CHARS", 500);
}

/** Max model output tokens. */
export function maxOutputTokens() {
  return intFromEnv("CHAT_MAX_OUTPUT_TOKENS", 400);
}

/** How many prior messages (user + assistant) are sent to the model. */
export function historyLimit() {
  return intFromEnv("CHAT_HISTORY_MESSAGES", 6);
}

/** Accepted messages per IP per window. */
export function rateLimitCount() {
  return intFromEnv("CHAT_RATE_LIMIT", 10);
}

export function rateWindowMs() {
  return intFromEnv("CHAT_RATE_WINDOW_MS", 60 * 60 * 1000);
}

/** Pause before the canned answer's first token, so "thinking" is visible. */
export function thinkDelayMs() {
  return intFromEnv("CHAT_THINK_DELAY_MS", 280, true);
}

/** Pause between canned words. */
export function tokenDelayMs() {
  return intFromEnv("CHAT_TOKEN_DELAY_MS", 18, true);
}
