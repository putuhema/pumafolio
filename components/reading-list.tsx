"use client";

import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { ArrowUpRightIcon } from "lucide-react";

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

const day = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

function host(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function Items({ links, verb }: { links: Link[]; verb: "saved" | "read" }) {
  return (
    <ul>
      {links.map((link) => (
        <li key={link.id} className="work-item">
          <div className="work-body">
            <p className="work-name">
              <a
                className="reading-title"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.title}
              </a>
            </p>
            <p className="work-desc">
              {host(link.url)} · {verb}{" "}
              {day.format(verb === "read" ? link.readAt! : link.savedAt)}
            </p>
          </div>
          <ArrowUpRightIcon className="reading-arrow" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}

function Lists() {
  const links = useQuery(anyApi.links.list, {}) as Link[] | undefined;
  if (links === undefined) return <p className="reading-note">Loading…</p>;
  if (links.length === 0) return <p className="reading-note">Nothing saved yet.</p>;

  const toRead = links.filter((l) => l.readAt === null);
  const read = links
    .filter((l) => l.readAt !== null)
    .sort((a, b) => b.readAt! - a.readAt!);

  return (
    <>
      <section className="work" id="to-read">
        <h2>to read</h2>
        {toRead.length ? (
          <Items links={toRead} verb="saved" />
        ) : (
          <p className="reading-note">All caught up.</p>
        )}
      </section>
      {read.length ? (
        <section className="work" id="read">
          <h2>read</h2>
          <Items links={read} verb="read" />
        </section>
      ) : null}
    </>
  );
}

/** Putu's whole reading list, live from Convex. */
export function ReadingList() {
  if (!client) {
    return <p className="reading-note">The reading list isn&apos;t set up yet.</p>;
  }
  return (
    <ConvexProvider client={client}>
      <Lists />
    </ConvexProvider>
  );
}
