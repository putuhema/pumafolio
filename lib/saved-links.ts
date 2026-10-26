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
  } catch {
    // Don't keep an empty list around for long if Convex had a hiccup.
    cacheLife("seconds");
    return [];
  }
}
