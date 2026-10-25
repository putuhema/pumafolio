import { rateLimitCount, rateWindowMs } from "./limits";

/**
 * In-memory fixed window, keyed by IP.
 *
 * This is per Node process. On Vercel each serverless instance has its own
 * map, so the cap is looser than 10/hour and it resets when the instance
 * goes cold. On one Railway process it holds until restart. Use Redis or
 * Upstash if you need a shared hard cap.
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

export function resetRateLimit() {
  buckets.clear();
}

export function checkRateLimit(ip: string, now = Date.now()) {
  const windowMs = rateWindowMs();
  const limit = rateLimitCount();
  const prev = (buckets.get(ip) ?? []).filter((t) => now - t < windowMs);

  if (prev.length >= limit) {
    buckets.set(ip, prev);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowMs - (now - prev[0]!)) / 1000),
    );
    return { ok: false as const, retryAfterSec };
  }

  prev.push(now);
  buckets.set(ip, prev);

  if (buckets.size > 5000) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }

  return { ok: true as const };
}

export function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  return "local";
}
