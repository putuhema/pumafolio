import type { Metadata } from "next";
import Link from "next/link";
import { Puma } from "@/components/puma";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="not-found">
      <Puma expression="confused" size={88} title="Puma, confused" />
      <h1>nothing here</h1>
      <p>
        <Link href="/">back</Link>
      </p>
    </main>
  );
}
