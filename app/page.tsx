import { FolioCanvas } from "@/components/folio-canvas";
import { site } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  alternateName: site.fullName,
  jobTitle: "Full-stack & AI engineer",
  description: site.tagline,
  url: site.url,
  email: site.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Mamuju",
    addressRegion: "West Sulawesi",
    addressCountry: "ID",
  },
  sameAs: [site.github, site.linkedin],
  knowsAbout: [
    "TypeScript",
    "Next.js",
    "LLM agents",
    "PostgreSQL",
    "healthcare software",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="canvas-page">
        <FolioCanvas />
      </main>
      <noscript>
        <style>{`.canvas-world{opacity:1!important}`}</style>
        <p className="noscript">
          Ask Puma and moving the canvas need JavaScript. The rest of this
          page does not.
        </p>
      </noscript>
    </>
  );
}
