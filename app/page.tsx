import { ChatDock } from "@/components/chat";
import { Puma } from "@/components/puma";
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
      <a className="skip" href="#work">
        skip to work
      </a>
      <div className="shell">
        <main className="profile">
          <header className="name-row">
            <h1>{site.name}</h1>
            <Puma expression="happy" size={58} title="Puma" />
          </header>
          <p className="tagline">{site.tagline}</p>

          <section className="work" id="work">
            <h2>work</h2>
            <ul>
              {site.work.map((item) => (
                <li key={item.slug}>
                  <p>
                    {item.name} – {item.description}
                  </p>
                  {item.href ? (
                    <a
                      className="view"
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      view
                    </a>
                  ) : (
                    <span className="view pending" title="No public link yet">
                      view
                      <span className="sr-only">, no public link yet</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="stack">
            <h2>stack</h2>
            <p>{site.stack}</p>
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
          </footer>
          <noscript>
            <p className="noscript">
              Ask Puma needs JavaScript. The rest of this page does not.
            </p>
          </noscript>
        </main>
        <ChatDock />
      </div>
    </>
  );
}
