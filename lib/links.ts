import { timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

/** Link shape returned by convex/links.ts `list`. */
export type Link = {
  id: string;
  url: string;
  title: string;
  savedAt: number;
  readAt: number | null;
};

// convex/_generated isn't committed before `npx convex dev` runs, so call by name.
export const linksApi = anyApi.links;

export function convexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || null;
}

export function convexClient() {
  const url = convexUrl();
  return url ? new ConvexHttpClient(url) : null;
}

/** Constant-time check of the owner key sent by the browser. */
export function isOwnerKey(candidate: string | null | undefined) {
  const expected = process.env.OWNER_KEY;
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Accept only plain http(s) URLs without credentials. */
export function normalizeUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (raw.length > 2000) return null;
  url.hash = "";
  return url;
}

function isPrivateAddress(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80")
  );
}

/** True only when every address the host resolves to is public. */
export async function isPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return !isPrivateAddress(host);
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  try {
    const addresses = await lookup(host, { all: true });
    return (
      addresses.length > 0 &&
      addresses.every((entry) => !isPrivateAddress(entry.address))
    );
  } catch {
    return false;
  }
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

function titleFromHtml(html: string) {
  const og =
    /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(
      html,
    ) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i.exec(
      html,
    );
  const tag = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const raw = og?.[1] ?? tag?.[1];
  return raw ? decodeEntities(raw).replace(/\s+/g, " ").trim() : null;
}

/** "example.com/some/path" when the page has no usable title. */
export function fallbackTitle(url: URL) {
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.hostname.replace(/^www\./, "")}${path}`.slice(0, 120);
}

const MAX_BYTES = 256 * 1024;

/**
 * Fetch the page title. Follows up to 3 redirects by hand so every hop is
 * checked against private addresses. Never throws; falls back to the URL.
 */
export async function fetchTitle(start: URL) {
  let url = start;
  try {
    for (let hop = 0; hop < 4; hop++) {
      if (!(await isPublicHost(url.hostname))) return fallbackTitle(start);
      const res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "pumafolio-reading-list/1.0", Accept: "text/html" },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        const nextUrl = next ? normalizeUrl(new URL(next, url).toString()) : null;
        if (!nextUrl) return fallbackTitle(start);
        url = nextUrl;
        continue;
      }
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("html") || !res.body) {
        return fallbackTitle(start);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = "";
      let bytes = 0;
      while (bytes < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (/<\/title>/i.test(html) && /<\/head>/i.test(html)) break;
      }
      await reader.cancel().catch(() => {});
      return titleFromHtml(html)?.slice(0, 200) || fallbackTitle(start);
    }
  } catch {
    /* fall through */
  }
  return fallbackTitle(start);
}

/*
 * Wrong owner keys per IP. 5 wrong keys in 15 minutes blocks that IP from
 * every owner action for an hour, even with the right key. In memory, so
 * each server instance counts on its own; Convex also caps wrong keys
 * across everyone (convex/links.ts), which is the hard limit.
 */
const OWNER_MAX_FAILURES = 5;
const OWNER_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const OWNER_BLOCK_MS = 60 * 60 * 1000;
const OWNER_MAX_TRACKED = 5_000;

type OwnerAttempts = { failures: number[]; blockedUntil: number };
const ownerAttempts = new Map<string, OwnerAttempts>();

export function resetOwnerLimit() {
  ownerAttempts.clear();
}

/** Seconds until this IP may try again, or 0 when it isn't blocked. */
export function ownerBlockedFor(ip: string, now = Date.now()) {
  const entry = ownerAttempts.get(ip);
  if (!entry || entry.blockedUntil <= now) return 0;
  return Math.ceil((entry.blockedUntil - now) / 1000);
}

export function recordOwnerFailure(ip: string, now = Date.now()) {
  const entry = ownerAttempts.get(ip) ?? { failures: [], blockedUntil: 0 };
  entry.failures = entry.failures.filter((t) => now - t < OWNER_FAILURE_WINDOW_MS);
  entry.failures.push(now);
  if (entry.failures.length >= OWNER_MAX_FAILURES) {
    entry.blockedUntil = now + OWNER_BLOCK_MS;
    entry.failures = [];
  }
  ownerAttempts.delete(ip);
  ownerAttempts.set(ip, entry);
  if (ownerAttempts.size > OWNER_MAX_TRACKED) {
    const oldest = ownerAttempts.keys().next().value;
    if (oldest !== undefined) ownerAttempts.delete(oldest);
  }
}

export function clearOwnerFailures(ip: string) {
  ownerAttempts.delete(ip);
}
