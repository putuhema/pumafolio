import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/lib/site";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const mono = localFont({
  src: [
    {
      path: "../fonts/ibm-plex-mono-latin-400-normal.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ibm-plex-mono-latin-700-normal.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-plex",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Putu Mahendra — Full-stack & AI engineer",
    template: "%s — Putu Mahendra",
  },
  description: site.description,
  applicationName: "Putu Mahendra",
  authors: [{ name: site.name, url: site.github }],
  creator: site.name,
  keywords: [
    "Putu Mahendra",
    "Putu Hendra Mahendra",
    "full-stack engineer",
    "AI engineer",
    "Indonesia",
    "Mamuju",
    "Next.js",
    "TypeScript",
    "hospital data",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_ID",
    url: "/",
    siteName: site.name,
    title: "Putu Mahendra — Full-stack & AI engineer",
    description: site.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: "Putu Mahendra — Full-stack & AI engineer",
    description: site.tagline,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={mono.className}>{children}</body>
    </html>
  );
}
