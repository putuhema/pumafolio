import {
  burstLimit,
  burstWindowMs,
  dailyLimit,
  globalDailyModelLimit,
  rateLimitCount,
  rateWindowMs,
  strikeCooldownMs,
  strikeLimit,
} from "./limits";

/**
 * In-memory limits, keyed by client IP:
 *  - burst:  a few messages per minute
 *  - window: messages per hour (CHAT_RATE_LIMIT)
 *  - daily:  messages per day
 *  - strikes: off-topic or injection attempts. Too many and the IP is timed out.
 * Plus one global daily budget for model calls, so a crowd of IPs can't run
 * up the bill. Past it, Puma falls back to canned answers.
 *
 * This is per Node process. On Vercel each instance has its own map, so the
 * caps are looser and reset when the instance goes cold. Use Redis or
 * Upstash if you need a shared hard cap.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CLIENTS = 10_000;

type Client = {
  hits: number[];
  strikes: number[];
  blockedUntil: number;
};

const clients = new Map<string, Client>();
let modelCalls: number[] = [];

export function resetRateLimit() {
  clients.clear();
  modelCalls = [];
}

function getClient(key: string) {
  let client = clients.get(key);
  if (client) {
    // Move to the end so eviction drops the least recently seen client.
    clients.delete(key);
  } else {
    client = { hits: [], strikes: [], blockedUntil: 0 };
  }
  clients.set(key, client);
  if (clients.size > MAX_CLIENTS) {
    const oldest = clients.keys().next().value;
    if (oldest !== undefined) clients.delete(oldest);
  }
  return client;
}

function within(times: number[], now: number, windowMs: number) {
  return times.filter((t) => now - t < windowMs);
}

function retryAfter(times: number[], now: number, windowMs: number, limit: number) {
  // The hit that has to expire before one more is allowed.
  const oldest = times[times.length - limit] ?? times[0] ?? now;
  return Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
}

export type LimitResult =
  | { ok: true }
  | {
      ok: false;
      retryAfterSec: number;
      reason: "blocked" | "burst" | "window" | "daily";
    };

export function checkRateLimit(key: string, now = Date.now()): LimitResult {
  const client = getClient(key);

  if (client.blockedUntil > now) {
    return {
      ok: false,
      reason: "blocked",
      retryAfterSec: Math.max(1, Math.ceil((client.blockedUntil - now) / 1000)),
    };
  }

  client.hits = within(client.hits, now, DAY_MS);

  const checks = [
    { reason: "burst" as const, windowMs: burstWindowMs(), limit: burstLimit() },
    { reason: "window" as const, windowMs: rateWindowMs(), limit: rateLimitCount() },
    { reason: "daily" as const, windowMs: DAY_MS, limit: dailyLimit() },
  ];
  for (const { reason, windowMs, limit } of checks) {
    const recent = within(client.hits, now, windowMs);
    if (recent.length >= limit) {
      return { ok: false, reason, retryAfterSec: retryAfter(recent, now, windowMs, limit) };
    }
  }

  client.hits.push(now);
  return { ok: true };
}

/** Records an off-topic or injection attempt. Returns true once the IP is timed out. */
export function recordStrike(key: string, now = Date.now()) {
  const client = getClient(key);
  client.strikes = within(client.strikes, now, rateWindowMs());
  client.strikes.push(now);
  if (client.strikes.length >= strikeLimit()) {
    client.blockedUntil = now + strikeCooldownMs();
    client.strikes = [];
    return true;
  }
  return false;
}

/** Takes one model call from the global daily budget. False when it's spent. */
export function takeModelBudget(now = Date.now()) {
  modelCalls = within(modelCalls, now, DAY_MS);
  if (modelCalls.length >= globalDailyModelLimit()) return false;
  modelCalls.push(now);
  return true;
}

function ipv6Prefix(ip: string) {
  // One person usually controls a whole /64, so rotating inside it must not
  // reset their limits.
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head = ""] = ip.split("::");
  const groups = head.split(":").filter(Boolean);
  if (groups.length >= 4 && !ip.startsWith("::")) {
    return `${groups.slice(0, 4).join(":")}::/64`;
  }
  return ip;
}

/**
 * The client IP, from headers the hosting proxy sets. Vercel overwrites
 * x-vercel-forwarded-for and x-real-ip, so a visitor can't spoof them. In a
 * plain x-forwarded-for, the left entries are client-supplied, so the last
 * entry (added by the nearest proxy) is used.
 */
export function clientIp(request: Request) {
  const pick = (value: string | null, from: "first" | "last") => {
    if (!value) return undefined;
    const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
    return from === "first" ? parts[0] : parts[parts.length - 1];
  };
  const ip =
    pick(request.headers.get("x-vercel-forwarded-for"), "first") ||
    request.headers.get("x-real-ip")?.trim() ||
    pick(request.headers.get("x-forwarded-for"), "last") ||
    "local";
  return ipv6Prefix(ip.slice(0, 80).toLowerCase());
}
