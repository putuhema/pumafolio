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

function Items({ links, done }: { links: Link[]; done?: boolean }) {
  return (
    <ul className="saved-list">
      {links.map((link) => (
        <li key={link.id}>
          <a
            className={done ? "saved-item saved-item-done" : "saved-item"}
            href={link.url}
            target="_blank"
            rel="noreferrer"
          >
            <span className="saved-title">{link.title}</span>
            <span className="saved-meta">
              {host(link.url)} · {day.format(done ? link.readAt! : link.savedAt)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Lists({ links }: { links: Link[] }) {
  if (links.length === 0) {
    return <p className="saved-note">Nothing saved yet.</p>;
  }
  const toRead = links.filter((l) => l.readAt === null);
  const read = links
    .filter((l) => l.readAt !== null)
    .sort((a, b) => b.readAt! - a.readAt!);

  return (
    <>
      <section className="saved-section" aria-labelledby="to-read">
        <h2 id="to-read">
          to read <span className="saved-count">{toRead.length}</span>
        </h2>
        {toRead.length ? (
          <Items links={toRead} />
        ) : (
          <p className="saved-note">All caught up.</p>
        )}
      </section>
      {read.length ? (
        <section className="saved-section" aria-labelledby="read">
          <h2 id="read">
            read <span className="saved-count">{read.length}</span>
          </h2>
          <Items links={read} done />
        </section>
      ) : null}
    </>
  );
}

function Live({ initial }: { initial: Link[] }) {
  // Until the socket connects, show what the server sent; no loading state.
  const live = useQuery(anyApi.links.list, {}) as Link[] | undefined;
  return <Lists links={live ?? initial} />;
}

/** Saved articles: server-rendered first, then live from Convex. */
export function SavedArticles({ initial }: { initial: Link[] }) {
  if (!client) return <Lists links={initial} />;
  return (
    <ConvexProvider client={client}>
      <Live initial={initial} />
    </ConvexProvider>
  );
}
