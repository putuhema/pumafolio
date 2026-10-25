import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>nothing here</h1>
      <p>
        <Link href="/">back</Link>
      </p>
    </main>
  );
}
