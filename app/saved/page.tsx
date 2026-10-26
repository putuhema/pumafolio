import type { Metadata } from "next";
import Link from "next/link";
import { FolioShell } from "@/components/folio-shell";
import { SavedArticles } from "@/components/saved-articles";
import { getSavedLinks } from "@/lib/saved-links";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  // The layout's title template adds " — Putu Mahendra".
  title: "Saved articles",
  description: `Articles ${site.name} is saving to read, and the ones he has finished.`,
  alternates: { canonical: "/saved" },
};

export default async function SavedPage() {
  const links = await getSavedLinks();
  return (
    <FolioShell>
      <main className="profile saved">
        <Link href="/" className="saved-back">
          <span aria-hidden="true">←</span> {site.name}
        </Link>
        <h1>saved articles</h1>
        <SavedArticles initial={links} />
      </main>
    </FolioShell>
  );
}
