import type { Metadata } from "next";
import Link from "next/link";
import { FolioShell } from "@/components/folio-shell";
import { ReadingList } from "@/components/reading-list";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  // The layout's title template adds " — Putu Mahendra".
  title: "Reading",
  description: `What ${site.name} is reading and has read.`,
  alternates: { canonical: "/reading" },
};

export default function ReadingPage() {
  return (
    <FolioShell>
      <main className="profile">
        <header className="name-row">
          <h1>
            <Link href="/" className="home-link">
              {site.name}
            </Link>
          </h1>
        </header>
        <p className="tagline">
          Articles I&apos;m saving to read, and the ones I&apos;ve finished.
        </p>

        <ReadingList />

        <footer className="foot">
          <Link href="/">← back</Link>
        </footer>
      </main>
    </FolioShell>
  );
}
