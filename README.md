# Putu Mahendra

Personal site for Putu Mahendra, a full-stack and AI engineer in Mamuju, Indonesia. Off-white page, monospace type. The right-hand column is a chatbot that only answers from `content/about.md`.

## Stack

Next.js (App Router) and TypeScript. Deploys on Vercel or Railway. No database. API keys stay on the server.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With no API key, Puma answers from a small canned FAQ so the page still works.

```bash
npm test
npm run lint
npm run build
```

## Environment

| Variable | Purpose |
| --- | --- |
| `LLM_PROVIDER` | `gemini` (default), `anthropic`, `openai`, or `groq` |
| `LLM_MODEL` | Overrides the default model for that provider |
| `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini key |
| `ANTHROPIC_API_KEY` | Claude key |
| `OPENAI_API_KEY` | OpenAI key |
| `GROQ_API_KEY` | Groq key |
| `NEXT_PUBLIC_SITE_URL` | Public origin, no trailing slash. Canonical and Open Graph. |
| `CHAT_MAX_INPUT_CHARS` | Default 500 |
| `CHAT_MAX_OUTPUT_TOKENS` | Default 400 |
| `CHAT_HISTORY_MESSAGES` | Default 6 |
| `CHAT_RATE_LIMIT` | Default 10 messages per window per IP |
| `CHAT_RATE_WINDOW_MS` | Default 1 hour |
| `CHAT_THINK_DELAY_MS` / `CHAT_TOKEN_DELAY_MS` | Pacing for the canned stream |

Default models:

- gemini: `gemini-3.5-flash-lite`
- anthropic: `claude-haiku-5-5`
- openai: `gpt-4.1-mini`
- groq: `llama-3.1-8b-instant`

`reasoning` is set to `none` (or the cheapest level the model allows) so a short answer does not spend a thinking budget. If the provider you pick has no key, `/api/chat` streams the canned FAQ instead. The key is never sent to the browser.

The rate limit is an in-memory map on one Node process. On Vercel each serverless instance has its own map, so the real cap is looser than 10/hour and it resets when the instance goes cold. On a single Railway process it holds until restart. Swap `lib/rate-limit.ts` for Redis or Upstash if you need a shared cap.

## Deploy

### Vercel

1. Import the repo. Framework preset is Next.js. Build command `npm run build`, output handled by Next.
2. Set the env vars above. At minimum set a provider key if you want live answers, and `NEXT_PUBLIC_SITE_URL` to the production origin.
3. Deploy. `VERCEL_URL` is used for metadata when `NEXT_PUBLIC_SITE_URL` is empty. Set the public URL and redeploy so canonical and Open Graph URLs match the domain you share.

### Railway

1. New project from this repo. Railpack / Nixpacks detects Node.
2. Build command `npm run build`. Start command `npm start`. Next reads `PORT`.
3. Set the same env vars. `RAILWAY_PUBLIC_DOMAIN` is used when `NEXT_PUBLIC_SITE_URL` is empty.
4. Health check path `/`.

## Content

Facts on the page and in the bot come from Putu's CV and resume, distilled into `content/about.md`. Edit that file to change what Puma will say. Do not add a phone number.

Links that are still unknown live in `lib/site.ts`:

- TODO: portfolio URL (`NEXT_PUBLIC_SITE_URL`)
- TODO: email display (currently the address on the CV)
- TODO: CV PDF link (`site.cv.href`)
- TODO: view URLs for rsud-hadir and kasirku (both private / unpublished)
