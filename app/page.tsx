import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { FolioShell } from "@/components/folio-shell";
import { site, type WorkItem } from "@/lib/site";

function ProjectList({ items }: { items: WorkItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.slug} className="work-item">
          <div className="work-body">
            <p className="work-name">{item.name}</p>
            <p className="work-desc">{item.description}</p>
          </div>
          {item.href ? (
            <a
              className="view"
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              view
              <ArrowUpRightIcon aria-hidden="true" />
              <span className="sr-only"> {item.name}</span>
            </a>
          ) : (
            <span className="view pending" title="No public link yet">
              private
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

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
      <a className="skip" href="#work">
        skip to work
      </a>
      <FolioShell>
        <main className="profile">
          <header className="name-row">
            <h1>{site.name}</h1>
          </header>
          <p className="tagline">{site.tagline}</p>

          <section className="work" id="work">
            <h2>work</h2>
            <ProjectList items={site.work} />
          </section>

          <section className="work" id="fun">
            <h2>fun stuff</h2>
            <ProjectList items={site.fun} />
          </section>

          <footer className="foot">
            <a href={site.github} rel="me noreferrer">
              github
            </a>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <a href={`mailto:${site.email}`}>email</a>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            {site.cv.href ? (
              <a href={site.cv.href}>cv</a>
            ) : (
              <span className="pending" title="CV PDF not linked yet">
                cv
                <span className="sr-only">, PDF not linked yet</span>
              </span>
            )}
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <Link href="/saved">saved articles</Link>
          </footer>
          <noscript>
            <p className="noscript">
              Ask Puma needs JavaScript. The rest of this page does not.
            </p>
          </noscript>
        </main>
      </FolioShell>
    </>
  );
}
