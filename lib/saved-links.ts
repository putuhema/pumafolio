import { cacheLife, cacheTag } from "next/cache";
import { convexClient, linksApi, type Link } from "./links";

/** Tag on the cached list. /api/links revalidates it after every write. */
export const LINKS_TAG = "links";

/**
 * The saved-articles list for the first paint, cached so /saved is served as
 * static HTML. The page's live Convex query takes over once it connects.
 */
export async function getSavedLinks(): Promise<Link[]> {
  "use cache";
  cacheTag(LINKS_TAG);
  const client = convexClient();
  if (!client) {
    cacheLife("minutes");
    return [];
  }
  try {
    const links = (await client.query(linksApi.list, {})) as Link[];
    cacheLife("hours");
    return links;
  } catch (error) {
    // Network errors keep the real reason in `cause` ("fetch failed" alone says little).
    const reason =
      error instanceof Error
        ? [error.message, error.cause instanceof Error ? error.cause.message : error.cause]
            .filter(Boolean)
            .join(" — ")
        : String(error);
    console.error(`[saved] Couldn't load saved articles from Convex: ${reason || "unknown error"}`);
    // Retry within a minute, but keep `expire` at 5 minutes: anything shorter
    // (like the "seconds" preset) can't be prerendered and fails the build.
    // The page's live Convex query fills in the list in the browser anyway.
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return [];
  }
}
