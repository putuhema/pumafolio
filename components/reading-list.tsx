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

const SHOWN = 6;

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
// One client for the page. Null until Convex is set up, and then nothing renders.
const client = url ? new ConvexReactClient(url) : null;

function host(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function List() {
  const links = useQuery(anyApi.links.list, {}) as Link[] | undefined;
  if (!links || links.length === 0) return null;
  // Unread first, then the most recently read.
  const shown = [
    ...links.filter((l) => l.readAt === null),
    ...links.filter((l) => l.readAt !== null),
  ].slice(0, SHOWN);

  return (
    <section className="work reading" id="reading">
      <h2>reading</h2>
      <ul>
        {shown.map((link) => (
          <li key={link.id} className="work-item">
            <div className="work-body">
              <p className="work-name">{link.title}</p>
              <p className="work-desc">
                {host(link.url)}
                {link.readAt !== null ? " · read" : ""}
              </p>
            </div>
            <a className="view" href={link.url} target="_blank" rel="noreferrer">
              open
              <ArrowUpRightIcon aria-hidden="true" />
              <span className="sr-only"> {link.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Putu's public reading list, live from Convex. */
export function ReadingList() {
  if (!client) return null;
  return (
    <ConvexProvider client={client}>
      <List />
    </ConvexProvider>
  );
}
