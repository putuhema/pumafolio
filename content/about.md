# Putu Mahendra — knowledge for Puma

This is the only source the portfolio chatbot may use. It is taken from Putu's CV and resume. If a detail is marked "not published", do not guess it. Do not invent employers, dates, metrics, cities, degrees, or links. Putu's phone number is not public. Never give one, and never invent one. Point people to email.

## Identity

- Goes by Putu Mahendra. Full name: Putu Hendra Mahendra.
- GitHub and LinkedIn handle: putuhema.
- Location: Mamuju, West Sulawesi, Indonesia. Time zone WITA (UTC+8).
- Work preference: open to remote. On-site, hybrid, and relocation cities are not published.
- Email: putuhendramahendra@gmail.com
- GitHub: https://github.com/putuhema
- LinkedIn: https://www.linkedin.com/in/putuhema
- Earlier portfolio and blog: https://putuhema-dev.vercel.app (phema.dev). The live URL of this Puma portfolio is not published yet.
- Phone number: not public.
- Date of birth and nationality details: not published. He is based in Indonesia.
- Target roles he lists: AI Full-Stack Engineer, Backend Engineer (Node/TypeScript, PostgreSQL), Full-Stack Developer (Next.js / NestJS), Junior AI Developer.

## Summary

Putu is a full-stack developer focused on applied AI in healthcare. He works as IT Support at RSUD Mamuju Tengah, a regional public hospital in Mamuju Tengah, West Sulawesi. That role started in April 2025 and is his first full-time role. He designs and ships the hospital's own web apps, and he builds LLM agents that work with clinical data carefully: read-only tools, guarded text-to-SQL, fixes that need a person to approve them and can be rolled back, PII masking, audit logs, and eval sets.

He trained in full-stack web development at Purwadhika Digital Technology School (Job Connector bootcamp, 2023) and ships end to end, from the schema to the deploy. Day to day he uses TypeScript across React/Next.js, SvelteKit, and Node (Effect, Hono, tRPC/oRPC, Express), plus SQL databases. He deploys on Vercel, Railway, Render, Neon, Convex, and Turso.

The one-line stack on this page is TypeScript, React, Next.js, Node, Postgres, Claude & OpenAI APIs.

## Skills

AI / LLM: agent tool calling, multi-step investigation, human-in-the-loop approval, text-to-SQL with guardrails (parse and check the query first: one SELECT only, blocked credential tables, row and time limits, least-privilege DB user), Model Context Protocol (MCP) tools, server-sent events streaming, prompt caching, token and cost tracking, PII masking before calls to external providers, audit logging, read-only checks at startup, eval sets (`pnpm eval`), knowledge-base chatbots that cite sources, offline full-text search (SQLite FTS5). Providers and SDKs: Anthropic Claude, OpenAI, Groq (LLaMA 3.3 70B), Z.ai GLM, Ollama, LM Studio, Vercel AI SDK.

Languages: TypeScript, JavaScript, SQL, HTML/CSS. Familiar with PHP, Java, and C# (level not published). Lua for his Neovim config.

Frontend: React 19, Next.js 13–16 (App Router), SvelteKit, Vue, Astro, TanStack Router / Query / Table, Redux, Zustand, Tailwind CSS, shadcn/ui, Radix, Chakra UI, Three.js, Motion, MDX, Electron, PWA, Web Audio API, Recharts.

Backend: Node.js, Bun, Effect, Hono, tRPC, oRPC, Express, REST, Better Auth, Clerk, Zod, Excel import/export (ExcelJS, xlsx).

Databases and ORMs: PostgreSQL (including Neon), MySQL/MariaDB (SIMRS Khanza), SQLite/libSQL (Turso, FTS5), Convex, Drizzle, Prisma, Sequelize.

Infra: Vercel, Railway, Render, Neon, Convex, Turso. Docker basics are listed; how deep that goes is not published.

Practices: Git/GitHub, monorepos (Turborepo, pnpm, Bun), Vitest, ESLint, audit logging, least-privilege DB users, rate limiting, undo/redo, optimistic UI, keyboard-first accessible UI, Neovim.

## Work

### IT Support, RSUD Mamuju Tengah

Regional public hospital, Mamuju Tengah, West Sulawesi. April 2025 – present. First full-time role.

He designed, built, and maintains the hospital's internal web applications:

- RSUD Absensi, then RSUD Hadir: the staff attendance system. Login, check-in/out, a monitoring dashboard, daily/weekly/monthly reports, and staff data management. Hadir is the 2026 rewrite on Next.js, oRPC, Drizzle, PostgreSQL, Better Auth, and Effect. 100+ commits, December 2025 – July 2026. The repo is private. No public URL is listed.
- Stok Oksigen: tracks the hospital's oxygen stock. Next.js 15, Hono, Drizzle, Postgres, TanStack Query/Table, Excel export, PWA.
- Laporan ISO-TB: a tuberculosis reporting tool. No separate stack is listed.
- RSUD Map / 3D Map: a campus map and 3D hospital map, which led to the Hospital AI wayfinding project.
- How-to Farmasi (FarmaWiki): a how-to knowledge base for pharmacy staff.

He also builds AI tooling on the hospital information system, SIMRS Khanza: Simha (an AI agent for hospital IT) and SIMRS AI Helper (a knowledge-base chatbot that cites its sources).

Day-to-day IT support duties beyond these apps (hardware, network, user support) are not published. Staff counts and other impact metrics are not published. Do not invent them.

### Independent developer

Self-directed projects. February 2024 – March 2025. After Purwadhika he kept shipping his own apps: Admin EE (an admin dashboard with user and role management), phema.dev (portfolio and blog on Next.js, Tailwind, and shadcn/ui, including a write-up called "My First AI" about a memory-based AI opponent for a card game), and Minigame (game clones in Next.js and TypeScript). He also helped his family during this period while applying for developer roles.

### Career break

Family responsibilities and job search, 2022 – June 2023. After university he supported his family while job hunting and kept learning on his own, then enrolled in Purwadhika's Full Stack Web Development bootcamp in July 2023. Freelance work from this period is not published.

## Projects on this page

- simha — AI assistant for hospital databases, read-only by design. View: https://github.com/putuhema/simha
- rsud-hadir — staff attendance app at RSUD Mamuju Tengah. No public view URL (private).
- kasirku — point-of-sale web app from the Purwadhika bootcamp (October 2023). No public view URL.

## AI projects

### Simha

AI assistant for hospital IT on SIMRS Khanza. 2026. Repo: https://github.com/putuhema/simha

Stack: TypeScript monorepo, Effect server, React, TanStack Router, Electron desktop app with a Khanza bridge, MySQL/MariaDB, SQLite audit DB. Works with Claude, OpenAI, Ollama, or LM Studio.

Investigation mode: paste a nurse's complaint. The agent checks real patient data through read-only tools, explains each step, gives a diagnosis, and proposes a fix as SQL. A fix runs only after a person approves it, inside a transaction, with a row-count check. The before-image is saved so it can be rolled back.

Tanya Data: questions in plain Indonesian (for example, the 10 most-used drugs this week) become one guarded SELECT. The answer can be a table, a chart, or a number. Limits include a 500-row cap and a time limit.

Safety: one SIMRS login with the same permissions as Khanza. The read user is SELECT-only and checked with SHOW GRANTS at startup. NIK, phone numbers, and addresses are masked. Everything is audit-logged. Also: routine data checks, an agent eval set, AI usage and cost tracking, MCP tools, discharge-summary drafts, and learning from examples, notes, and feedback.

### Hospital AI / P-Map

3D hospital map editor with an AI wayfinding chat. 2026. Repo: https://github.com/putuhema/hospital-ai Live demo: https://hospital-ai-chi.vercel.app

Stack: SvelteKit, Three.js, Convex, Better Auth. Staff build a hospital campus on a grid: buildings (including L-shapes), corridors, garden paths, 15 room types, templates, undo/redo. Visitors get a shareable map with walking directions. A tool-calling chat (Claude and GLM) answers questions about the map, with streaming, rate limiting, response caching, and tests.

### PharmaLens

Full-stack AI pharmacy assistant. Private. 2026. Next.js 15 (T3), tRPC, Drizzle, libSQL, Groq LLaMA 3.3 70B, Vercel AI SDK. No public URL.

### SIMRS AI Helper

Knowledge-base chatbot for the hospital system. Private. 2026. Next.js 16, Groq. Answers cite the knowledge-base articles they come from.

### PUMS Knowledge Base

Private. 2026. Live: https://pums-kb.vercel.app Stack: SvelteKit, Turso (SQLite FTS5), offline support, Vitest.

### Field Station P-4 (puma)

A different personal site, styled as a CRT television, with a 3D host named Mr. P. 2026. Repo: https://github.com/putuhema/puma

Stack: Next.js 16, React 19, Convex, Three.js, MDX, Tailwind CSS, Web Audio. It streams LLM replies that can mount live UI (a dossier, project shelf, contact form, and game) and falls back to an offline phrasebook. Real-time chat, guestbook, and high scores on Convex. Keyboard-first, plus a printable recruiter page.

This portfolio (the page you are on) is a separate, newer site. Its mascot is also called Puma: a flat tan bean-shaped cat. Do not confuse the two.

## Other projects

- Jujurnal: a diary and learning app (Turborepo, Next.js 16, Convex, Better Auth). https://jujurnal-web.vercel.app 2026.
- My Mini Games: a collection of browser games. https://my-mini-games-ten.vercel.app 2026.
- Athena, English With Me, GetToKnowMe, STT Dharma Laksana site: other web apps, TypeScript, private, 2026. One-line descriptions are not published.
- Taiyo, Commonplace Book, Reader, Birthday / Invitation: small personal web apps, 2026. No further description is published.
- Admin EE: an admin dashboard with user and role management. TypeScript. 2024.
- phema.dev: earlier portfolio and blog. Next.js, Tailwind, shadcn/ui. Includes the write-up "My First AI" on a memory-based AI opponent for a card game. https://putuhema-dev.vercel.app 2024.
- Minigame: clones of games he found interesting. Next.js, TypeScript. 2024.

Purwadhika bootcamp, 2023:

- Toten: a multi-warehouse e-commerce platform for clothing (React, TypeScript, Tailwind, TanStack Query, Clerk, Node/Express, Sequelize, shadcn/ui). Final project, November 2023. Cohort repo id: purwadhikafullstack/JCWDOL01101. Do not invent a URL from that id.
- Kasirku: a point-of-sale app (React, Redux, Chakra UI, Node/Express). October 2023. No public URL.
- Hangout: an event management app (React, Clerk, Node/Express, Prisma). August–October 2023. No public URL.

University:

- Giziku, thesis: a stunting-detection web app that measures child growth against anthropometric standards (Express, Pug, MySQL, sessions/auth). December 2021 – February 2022. The exact thesis title is not published.
- E-Gov: a campus project, December 2021. No description is published.
- Bawaslu QR: a web app (EJS), October–November 2021. A one-line description is not published.
- Book API: a REST API for a book directory. January 2021.

## Education

Job Connector Bootcamp, Full Stack Web Development, Purwadhika Digital Technology School. Online cohort, evening classes. July 2023 through an end month that is not published. Graduated by January 2024. Built Hangout, Kasirku, and the Toten final project. Went through Purwadhika Career Network (PCN) career preparation after graduating (February 2024; the session date listed is 5 February 2024).

Bachelor of Information Systems (S1 Sistem Informasi). Started 2018. University name, city, graduation year, and GPA are not published. Do not guess them. Thesis: Giziku.

No certifications are published. Do not invent certificates. A Coursera course is unconfirmed. Do not mention it.

## Community

- Member of the Purwadhika Alumni Club since October 2024.
- PCN Career Preparation, Purwadhika, 5 February 2024.
- Purwadhika Community talks in August 2026: "Remote Career sebagai Programmer, Mulai dari Mana?" and "REMOTE WORK: Bigger Career, Better Pay, is That True?"

## Languages and interests

- Indonesian: native.
- English: he writes project docs in English. A proficiency level is not published. Do not assign one.
- Other languages: not published.
- Interests: music, games, anime, art, building small games and interactive 3D for the web.

## References

Available on request. No named referee is published.
