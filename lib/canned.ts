import { site } from "./site";

export const DECLINE =
  "That's outside what I know about Putu. Ask about his work, projects, or stack.";

export type Mood = "idea" | "idle";

type Topic = {
  id: string;
  keys: string[];
  answer: string;
  mood: Mood;
};

const topics: Topic[] = [
  {
    id: "simha",
    keys: [
      "simha",
      "tanya data",
      "khanza",
      "text-to-sql",
      "text to sql",
      "guarded sql",
      "read-only",
    ],
    mood: "idea",
    answer:
      "Simha is an AI assistant for hospital IT on SIMRS Khanza. It queries hospital data through a read-only DB user, checks SQL before it runs, and applies a fix only after a person approves it, inside a transaction with a saved before-image. Tanya Data answers plain-Indonesian questions with one guarded SELECT (500-row cap and a time limit). NIK, phone numbers, and addresses are masked, and the work is audit-logged. https://github.com/putuhema/simha",
  },
  {
    id: "hadir",
    keys: [
      "rsud-hadir",
      "rsud hadir",
      "hadir",
      "absensi",
      "attendance",
      "check-in",
      "check in",
    ],
    mood: "idea",
    answer:
      "RSUD Hadir is the staff attendance system Putu built for RSUD Mamuju Tengah. It covers check-in and check-out, a monitoring dashboard, and daily, weekly, and monthly reports. The 2026 rewrite uses Next.js, oRPC, Drizzle, PostgreSQL, Better Auth, and Effect (100+ commits, Dec 2025–Jul 2026). It replaced RSUD Absensi. The repo is private, so there is no public view link.",
  },
  {
    id: "kasirku",
    keys: ["kasirku", "kasir", "point-of-sale", "point of sale"],
    mood: "idea",
    answer:
      "Kasirku is a point-of-sale web app Putu built in October 2023 during the Purwadhika bootcamp (React, Redux, Chakra UI, Node, Express). No public demo or repo is listed.",
  },
  {
    id: "hospital-ai",
    keys: [
      "hospital ai",
      "hospital-ai",
      "p-map",
      "pmap",
      "wayfinding",
      "3d map",
      "campus map",
    ],
    mood: "idea",
    answer:
      "Hospital AI / P-Map is a 3D hospital map editor with an AI wayfinding chat (SvelteKit, Three.js, Convex, Better Auth). Staff build the campus; visitors get walking directions from a tool-calling chat on Claude and GLM. Live demo: https://hospital-ai-chi.vercel.app Repo: https://github.com/putuhema/hospital-ai",
  },
  {
    id: "pharma",
    keys: ["pharmalens", "farmawiki", "farmasi", "stok oksigen", "oxygen", "iso-tb", "iso tb"],
    mood: "idea",
    answer:
      "At the hospital Putu also built Stok Oksigen (oxygen stock: Next.js 15, Hono, Drizzle, Postgres, Excel export, PWA), Laporan ISO-TB (tuberculosis reporting), and How-to Farmasi, a pharmacy how-to wiki. PharmaLens is a private AI pharmacy assistant (Next.js 15, tRPC, Drizzle, libSQL, Groq LLaMA 3.3 70B). No public PharmaLens URL is listed.",
  },
  {
    id: "puma",
    keys: ["mascot", "field station", "mr. p", "mr p", "who are you", "what are you"],
    mood: "idea",
    answer:
      "I'm the assistant on this page. Putu also built a different site called Field Station P-4, a CRT-style portfolio with a 3D host named Mr. P: https://github.com/putuhema/puma",
  },
  {
    id: "remote",
    keys: [
      "remote",
      "relocat",
      "wfh",
      "work from",
      "on-site",
      "onsite",
      "hybrid",
      "open to",
    ],
    mood: "idea",
    answer:
      "Yes. Putu is in Mamuju, West Sulawesi, Indonesia (WITA, UTC+8) and is open to remote work. Whether he can relocate is not published.",
  },
  {
    id: "contact",
    keys: [
      "email",
      "e-mail",
      "contact",
      "hire",
      "linkedin",
      "github",
      "reach",
      "cv",
      "resume",
    ],
    mood: "idea",
    answer: `Email ${site.email}. GitHub ${site.github}. LinkedIn ${site.linkedin}. His phone number is not public. A CV PDF is not linked on this site yet.`,
  },
  {
    id: "education",
    keys: [
      "purwadhika",
      "education",
      "bootcamp",
      "university",
      "kuliah",
      "degree",
      "giziku",
      "thesis",
      "sistem informasi",
    ],
    mood: "idea",
    answer:
      "He finished the Job Connector bootcamp in Full Stack Web Development at Purwadhika (started July 2023, graduated by January 2024; online, evening classes). Before that, a Bachelor of Information Systems (S1 Sistem Informasi), started 2018. The university name and graduation year are not published. His thesis was Giziku, a stunting-detection web app (Express, MySQL), December 2021–February 2022.",
  },
  {
    id: "stack",
    keys: [
      "stack",
      "skills",
      "typescript",
      "next.js",
      "nextjs",
      "postgres",
      "postgresql",
      "tech",
      "tools",
      "keahlian",
    ],
    mood: "idea",
    answer:
      "The short list is TypeScript, React, Next.js, Node, Postgres, and Claude & OpenAI APIs. He also uses Effect, Hono, tRPC, oRPC, SvelteKit, Drizzle, MySQL/MariaDB, SQLite, Groq, and the Vercel AI SDK, and he deploys on Vercel, Railway, Render, Neon, Convex, and Turso.",
  },
  {
    id: "experience",
    keys: [
      "rsud",
      "mamuju",
      "it support",
      "experience",
      "hospital",
      "rumah sakit",
      "job",
      "work at",
    ],
    mood: "idea",
    answer:
      "Since April 2025 he has been IT Support at RSUD Mamuju Tengah, a regional public hospital, and it is his first full-time role. He builds the hospital's web apps (attendance, oxygen stock, TB reports, maps, a pharmacy wiki) and AI tools on SIMRS Khanza (Simha and SIMRS AI Helper). Before that he was an independent developer (February 2024–March 2025) after a career break for family responsibilities (2022–June 2023).",
  },
  {
    id: "location",
    keys: ["where", "location", "based", "timezone", "time zone", "indonesia", "wita"],
    mood: "idea",
    answer:
      "Mamuju, West Sulawesi, Indonesia. Time zone WITA, UTC+8. He is open to remote work.",
  },
  {
    id: "projects",
    keys: ["projects", "proyek", "portfolio", "built", "shipped", "jujurnal", "mini games"],
    mood: "idea",
    answer:
      "On this page: Simha, RSUD Hadir, and Kasirku. He has also shipped Hospital AI / P-Map (https://hospital-ai-chi.vercel.app), Jujurnal (https://jujurnal-web.vercel.app), My Mini Games (https://my-mini-games-ten.vercel.app), and the earlier site phema.dev (https://putuhema-dev.vercel.app). Ask about one of them.",
  },
  {
    id: "who",
    keys: [
      "who is putu",
      "who's putu",
      "about putu",
      "putu mahendra",
      "putu hendra",
      "siapa",
      "bio",
      "introduce",
    ],
    mood: "idea",
    answer:
      "Putu Mahendra (Putu Hendra Mahendra) is a full-stack and AI engineer in Mamuju, West Sulawesi. He is IT Support at RSUD Mamuju Tengah, where he builds the hospital's web apps and LLM tools that stay careful with clinical data: read-only access, guarded text-to-SQL, human-approved fixes, PII masking, and audit logs. He graduated from Purwadhika's Full Stack Web Development bootcamp by January 2024.",
  },
  {
    id: "greeting",
    keys: ["hello", "hi", "hey", "hai", "halo", "hei"],
    mood: "idle",
    answer:
      "I'm Puma. Ask me about Putu Mahendra's work, projects, or how to reach him.",
  },
];

function scoreTopic(query: string, topic: Topic) {
  let score = 0;
  for (const key of topic.keys) {
    if (key.length <= 4) {
      const re = new RegExp(`(?:^|[^a-z0-9])${key}(?=$|[^a-z0-9])`, "i");
      if (re.test(query)) score += 4;
    } else if (query.includes(key)) {
      score += key.length;
    }
  }
  return score;
}

export function answerQuestion(question: string): { text: string; mood: Mood } {
  const query = question.toLowerCase().trim();
  if (!query) return { text: DECLINE, mood: "idle" };

  let best: Topic | null = null;
  let bestScore = 0;
  for (const topic of topics) {
    const score = scoreTopic(query, topic);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }

  if (!best || bestScore < 4) return { text: DECLINE, mood: "idle" };
  return { text: best.answer, mood: best.mood };
}
