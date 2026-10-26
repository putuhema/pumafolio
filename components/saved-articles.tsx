"use client";

import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { anyApi } from "convex/server";

type Link = {
  id: string;
  url: string;
  title: string;
  savedAt: number;
  readAt: number | null;
};

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
// One client for the page. Null until Convex is set up.
const client = url ? new ConvexReactClient(url) : null;

const day = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function host(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

/** The site's own name, for the tile: "developer.mozilla.org" → "m". */
function initial(site: string) {
  const parts = site.split(".");
  const name = parts.length >= 2 ? parts[parts.length - 2]! : site;
  return name.charAt(0);
}

function Bookmarks({ links }: { links: Link[] }) {
  if (links.length === 0) {
    return <p className="saved-note">Nothing saved yet.</p>;
  }
  return (
    <ul className="saved-list">
      {links.map((link) => {
        const site = host(link.url);
        return (
          <li key={link.id}>
            <a
              className="saved-item"
              href={link.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="saved-tile" aria-hidden="true">
                {initial(site)}
              </span>
              <span className="saved-text">
                <span className="saved-title">{link.title}</span>
                <span className="saved-host">{site}</span>
              </span>
              <time className="saved-date" dateTime={new Date(link.savedAt).toISOString()}>
                {day.format(link.savedAt)}
              </time>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function Live({ initial }: { initial: Link[] }) {
  // Until the socket connects, show what the server sent; no loading state.
  const live = useQuery(anyApi.links.list, {}) as Link[] | undefined;
  return <Bookmarks links={live ?? initial} />;
}

/** Saved articles, newest first: server-rendered, then live from Convex. */
export function SavedArticles({ initial }: { initial: Link[] }) {
  if (!client) return <Bookmarks links={initial} />;
  return (
    <ConvexProvider client={client}>
      <Live initial={initial} />
    </ConvexProvider>
  );
}
