import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="atlas atlas-lost">
      <div>
        <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
          <circle r="12" fill="none" stroke="currentColor" strokeDasharray="3 3" />
        </svg>
        <h1>No node here</h1>
        <p>This page isn&rsquo;t on the map.</p>
        <Link href="/">Back to the map</Link>
      </div>
    </main>
  );
}
