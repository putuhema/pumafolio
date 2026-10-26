import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
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
  themeColor: "#fdf7f9",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(geist.variable, "font-sans")}>
      <body className={geist.className}>{children}</body>
    </html>
  );
}
