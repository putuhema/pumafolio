export type WorkItem = {
  slug: string;
  name: string;
  description: string;
  /** Public URL, or null when the CV lists no link. */
  href: string | null;
};

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return "http://localhost:43123";
}

export const site = {
  name: "Putu Mahendra",
  fullName: "Putu Hendra Mahendra",
  tagline: "Full-stack & AI engineer. I build safe AI tools for hospital data.",
  description:
    "Full-stack & AI engineer in Mamuju, Indonesia. I build safe AI tools for hospital data.",
  location: "Mamuju, West Sulawesi, Indonesia",
  url: resolveSiteUrl(),
  email: "putuhendramahendra@gmail.com",
  github: "https://github.com/putuhema",
  linkedin: "https://www.linkedin.com/in/putuhema",
  cv: { href: null as string | null },
  stack: "TypeScript, React, Next.js, Node, Postgres, Claude & OpenAI APIs",
  work: [
    {
      slug: "simha",
      name: "simha",
      description: "AI assistant for hospital databases, read-only by design",
      href: "https://github.com/putuhema/simha",
    },
    {
      slug: "rsud-hadir",
      name: "rsud-hadir",
      description: "staff attendance app used daily at RSUD Mamuju Tengah",
      // TODO: project view URL. Private repo; the CV has no public link.
      href: null,
    },
    {
      slug: "hospital-ai",
      name: "hospital ai",
      description: "3D hospital map editor with an AI wayfinding chat",
      href: "https://hospital-ai-chi.vercel.app",
    },
  ] satisfies WorkItem[],
  /** Side projects built for fun, not for an employer. */
  fun: [
    {
      slug: "jujurnal",
      name: "jujurnal",
      description: "a diary and learning app",
      href: "https://jujurnal-web.vercel.app",
    },
    {
      slug: "my-mini-games",
      name: "my mini games",
      description: "a small collection of browser games",
      href: "https://my-mini-games-ten.vercel.app",
    },
  ] satisfies WorkItem[],
};
