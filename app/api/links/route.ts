import {
  convexClient,
  fetchTitle,
  isPublicHost,
  isOwnerKey,
  linksApi,
  normalizeUrl,
  type Link,
} from "@/lib/links";

const noStore = { "Cache-Control": "no-store" };

function json(status: number, body: unknown) {
  return Response.json(body, { status, headers: noStore });
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
  const key = request.headers.get("x-owner-key");
  if (!isOwnerKey(key)) return json(401, { error: "Only Putu can do that." });

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
      const result = (await client.mutation(linksApi.save, {
        key: key!,
        url: url.toString(),
        title,
      })) as { id: string; duplicate: boolean };
      return json(200, { ...result, title, url: url.toString() });
    }
    if (body.action === "read" || body.action === "remove") {
      if (typeof body.id !== "string") return json(400, { error: "Bad request." });
      const fn = body.action === "read" ? linksApi.markRead : linksApi.remove;
      await client.mutation(fn, { key: key!, id: body.id });
      return json(200, { ok: true });
    }
  } catch {
    return json(502, { error: "Couldn't update the reading list." });
  }
  return json(400, { error: "Bad request." });
}
