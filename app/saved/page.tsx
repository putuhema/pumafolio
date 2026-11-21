import type { Metadata } from "next";
import { Atlas } from "@/components/atlas";
import { getSavedLinks } from "@/lib/saved-links";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  // The layout's title template adds " — Putu Mahendra".
  title: "Saved articles",
  description: `Articles ${site.name} has saved.`,
  alternates: { canonical: "/saved" },
};

export default async function SavedPage() {
  const links = await getSavedLinks();
  return (
    <main>
      <Atlas savedLinks={links} initialSection="saved" />
    </main>
  );
}
