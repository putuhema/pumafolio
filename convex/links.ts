// Uses the generic builders so the app builds before `npx convex dev`
// has generated convex/_generated.
import {
  mutationGeneric,
  queryGeneric,
  type GenericMutationCtx,
  type GenericDataModel,
} from "convex/server";
import { v, type GenericId } from "convex/values";

type Ctx = GenericMutationCtx<GenericDataModel>;

/**
 * Convex functions can be called by anyone who knows the deployment URL,
 * so every write checks the owner key here, not only in the Next.js route.
 *
 * Wrong keys are counted across everyone (Convex can't see IPs). Past
 * MAX_FAILURES in an hour, every write is refused until the hour passes,
 * even with the right key. That keeps guessing a key impractically slow.
 */
const MAX_FAILURES = 20;
const FAILURE_WINDOW_MS = 60 * 60 * 1000;

type Denied = { ok: false; error: "not-allowed" | "locked" };

async function recentFailures(ctx: Ctx, now: number) {
  return ctx.db
    .query("ownerFailures")
    .withIndex("by_at", (q) => q.gt("at", now - FAILURE_WINDOW_MS))
    .take(MAX_FAILURES);
}

/** Null when the key is right and writes aren't locked; otherwise why not. */
async function checkOwner(ctx: Ctx, key: string): Promise<Denied | null> {
  const now = Date.now();
  if ((await recentFailures(ctx, now)).length >= MAX_FAILURES) {
    return { ok: false, error: "locked" };
  }
  const expected = process.env.OWNER_KEY;
  if (expected && key === expected) return null;

  await ctx.db.insert("ownerFailures", { at: now });
  // Drop a few expired rows so the table stays small.
  const stale = await ctx.db
    .query("ownerFailures")
    .withIndex("by_at", (q) => q.lte("at", now - FAILURE_WINDOW_MS))
    .take(20);
  for (const row of stale) {
    await ctx.db.delete(row._id as GenericId<"ownerFailures">);
  }
  return { ok: false, error: "not-allowed" };
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
    const denied = await checkOwner(ctx, key);
    if (denied) return denied;
    const existing = await ctx.db
      .query("links")
      .withIndex("by_url", (q) => q.eq("url", url))
      .first();
    if (existing) {
      return { ok: true as const, id: existing._id as string, duplicate: true };
    }
    const id = await ctx.db.insert("links", {
      url,
      title: title.slice(0, 200),
      savedAt: Date.now(),
    });
    return { ok: true as const, id: id as string, duplicate: false };
  },
});

export const markRead = mutationGeneric({
  args: { key: v.string(), id: v.string() },
  handler: async (ctx, { key, id }) => {
    const denied = await checkOwner(ctx, key);
    if (denied) return denied;
    const docId = ctx.db.normalizeId("links", id);
    if (!docId) throw new Error("No such link.");
    await ctx.db.patch(docId, { readAt: Date.now() });
    return { ok: true as const };
  },
});

export const remove = mutationGeneric({
  args: { key: v.string(), id: v.string() },
  handler: async (ctx, { key, id }) => {
    const denied = await checkOwner(ctx, key);
    if (denied) return denied;
    const docId = ctx.db.normalizeId("links", id);
    if (!docId) throw new Error("No such link.");
    await ctx.db.delete(docId);
    return { ok: true as const };
  },
});
