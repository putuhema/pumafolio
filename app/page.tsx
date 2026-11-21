import { Atlas } from "@/components/atlas";
import { getSavedLinks } from "@/lib/saved-links";
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

export default async function Home() {
  const links = await getSavedLinks();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <Atlas savedLinks={links} />
      </main>
    </>
  );
}
