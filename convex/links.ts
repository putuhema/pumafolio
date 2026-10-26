// Uses the generic builders so the app builds before `npx convex dev`
// has generated convex/_generated.
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

/**
 * Convex functions can be called by anyone who knows the deployment URL,
 * so every write checks the owner key here, not only in the Next.js route.
 */
function assertOwner(key: string) {
  const expected = process.env.OWNER_KEY;
  if (!expected || key !== expected) throw new Error("Not allowed.");
}

const MAX_LINKS = 200;

/** Newest first. Public. */
export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("links")
      .withIndex("by_savedAt")
      .order("desc")
      .take(MAX_LINKS);
    return rows.map((row) => ({
      id: row._id as string,
      url: row.url as string,
      title: row.title as string,
      savedAt: row.savedAt as number,
      readAt: (row.readAt as number | undefined) ?? null,
    }));
  },
});

export const save = mutationGeneric({
  args: { key: v.string(), url: v.string(), title: v.string() },
  handler: async (ctx, { key, url, title }) => {
    assertOwner(key);
    const existing = await ctx.db
      .query("links")
      .withIndex("by_url", (q) => q.eq("url", url))
      .first();
    if (existing) return { id: existing._id as string, duplicate: true };
    const id = await ctx.db.insert("links", {
      url,
      title: title.slice(0, 200),
      savedAt: Date.now(),
    });
    return { id: id as string, duplicate: false };
  },
});

export const markRead = mutationGeneric({
  args: { key: v.string(), id: v.string() },
  handler: async (ctx, { key, id }) => {
    assertOwner(key);
    const docId = ctx.db.normalizeId("links", id);
    if (!docId) throw new Error("No such link.");
    await ctx.db.patch(docId, { readAt: Date.now() });
    return { ok: true };
  },
});

export const remove = mutationGeneric({
  args: { key: v.string(), id: v.string() },
  handler: async (ctx, { key, id }) => {
    assertOwner(key);
    const docId = ctx.db.normalizeId("links", id);
    if (!docId) throw new Error("No such link.");
    await ctx.db.delete(docId);
    return { ok: true };
  },
});
