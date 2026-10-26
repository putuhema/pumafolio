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

/** Messages per IP in a short burst window. Stops scripted spam. */
export function burstLimit() {
  return intFromEnv("CHAT_BURST_LIMIT", 3);
}

export function burstWindowMs() {
  return intFromEnv("CHAT_BURST_WINDOW_MS", 60 * 1000);
}

/** Messages per IP per day. */
export function dailyLimit() {
  return intFromEnv("CHAT_DAILY_LIMIT", 30);
}

/** Off-topic or injection attempts per IP (within the rate window) before a timeout. */
export function strikeLimit() {
  return intFromEnv("CHAT_STRIKE_LIMIT", 3);
}

/** How long an IP is blocked after too many strikes. */
export function strikeCooldownMs() {
  return intFromEnv("CHAT_STRIKE_COOLDOWN_MS", 60 * 60 * 1000);
}

/** Model calls per day across all visitors. Past this, Puma uses canned answers. */
export function globalDailyModelLimit() {
  return intFromEnv("CHAT_GLOBAL_DAILY_LIMIT", 500);
}
