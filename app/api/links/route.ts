import {
  clearOwnerFailures,
  convexClient,
  fetchTitle,
  isPublicHost,
  isOwnerKey,
  linksApi,
  normalizeUrl,
  ownerBlockedFor,
  recordOwnerFailure,
  type Link,
} from "@/lib/links";
import { clientIp } from "@/lib/rate-limit";

const noStore = { "Cache-Control": "no-store" };

function json(status: number, body: unknown) {
  return Response.json(body, { status, headers: noStore });
}

function tooMany(retryAfterSec: number) {
  return Response.json(
    { error: "Too many wrong keys. Try again later." },
    { status: 429, headers: { ...noStore, "Retry-After": String(retryAfterSec) } },
  );
}

type Denied = { ok: false; error: "not-allowed" | "locked" };

/** Convex refuses a write with { ok: false } when the key is wrong or writes are locked. */
function denied(result: unknown) {
  const r = result as Partial<Denied> | null;
  if (!r || r.ok !== false) return null;
  return r.error === "locked"
    ? tooMany(60 * 60)
    : json(401, { error: "Only Putu can do that." });
}

/** Public reading list, newest first. */
export async function GET() {
  const client = convexClient();
  if (!client) return json(503, { error: "The reading list isn't set up yet." });
  try {
    const links = (await client.query(linksApi.list, {})) as Link[];
    return json(200, { links });
  } catch {
    return json(502, { error: "Couldn't load the reading list." });
  }
}

type Body =
  | { action: "unlock" }
  | { action: "save"; url: string }
  | { action: "read"; id: string }
  | { action: "remove"; id: string };

/** Owner-only: check the key, save a link, or mark one read. */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const waitSec = ownerBlockedFor(ip);
  if (waitSec > 0) return tooMany(waitSec);

  const key = request.headers.get("x-owner-key");
  if (!isOwnerKey(key)) {
    recordOwnerFailure(ip);
    const blocked = ownerBlockedFor(ip);
    return blocked > 0 ? tooMany(blocked) : json(401, { error: "Only Putu can do that." });
  }
  clearOwnerFailures(ip);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") return json(400, { error: "Bad request." });
  if (body.action === "unlock") return json(200, { ok: true });

  const client = convexClient();
  if (!client) return json(503, { error: "The reading list isn't set up yet." });

  try {
    if (body.action === "save") {
      const url = typeof body.url === "string" ? normalizeUrl(body.url) : null;
      if (!url) return json(400, { error: "That doesn't look like an http(s) link." });
      if (!(await isPublicHost(url.hostname))) {
        return json(400, { error: "Only public web links can be saved." });
      }
      const title = await fetchTitle(url);
      const result = await client.mutation(linksApi.save, {
        key: key!,
        url: url.toString(),
        title,
      });
      const refused = denied(result);
      if (refused) return refused;
      const { id, duplicate } = result as { id: string; duplicate: boolean };
      return json(200, { id, duplicate, title, url: url.toString() });
    }
    if (body.action === "read" || body.action === "remove") {
      if (typeof body.id !== "string") return json(400, { error: "Bad request." });
      const fn = body.action === "read" ? linksApi.markRead : linksApi.remove;
      const refused = denied(await client.mutation(fn, { key: key!, id: body.id }));
      if (refused) return refused;
      return json(200, { ok: true });
    }
  } catch {
    return json(502, { error: "Couldn't update the reading list." });
  }
  return json(400, { error: "Bad request." });
}
