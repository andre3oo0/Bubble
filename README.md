
# Bubble - Mental Health & Emotional Support Platform

## Setup Instructions

Requires Node.js 20 or newer.

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and add an AI key. Groq's free tier works through the same settings:
```
OPENAI_API_KEY=your_groq_key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=openai/gpt-oss-120b
```
For OpenAI instead, set only `OPENAI_API_KEY`.

4. Start the development server:
```bash
npm run dev
```

The application will start on http://localhost:5000 (set `PORT` in `.env` to change it).

Locally you don't need a database server. Without `DATABASE_URL` the app uses an embedded Postgres (PGlite) stored in `.data/pglite`; delete that folder to start fresh. Migrations run automatically on startup.

## Production

The app ships as one Docker container (see `Dockerfile`) that serves both the API and the frontend. Any host that runs containers works: Render, Railway, Fly.io, Google Cloud Run.

Set these in the host's environment settings (never in the repo):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Managed Postgres (Neon, Supabase). Required, the server won't start without it |
| `BETTER_AUTH_SECRET` | Long random value, different from your local one. Required |
| `BETTER_AUTH_URL` | The public URL, e.g. `https://bubble.example.com` |
| `OPENAI_API_KEY` | A separate key from your local one, so either can be revoked |
| `OPENAI_BASE_URL`, `OPENAI_MODEL` | Only when using Groq (or another OpenAI-compatible provider), as in the setup above |
| `BREVO_API_KEY`, `EMAIL_FROM` | Password reset and email confirmation. `EMAIL_FROM` must be a sender verified in Brevo. `RESEND_API_KEY` works instead, but Resend needs a domain |

Optional ones (chat limits, model, proxy, Android app) are described in `.env.example`. Migrations run automatically on startup, and `/api/health` is the health check.

CI (`.github/workflows/ci.yml`) type-checks, tests and builds every push and pull request. It needs no secrets.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (API + frontend on one port) |
| `npm run check` | Type-check the whole project |
| `npm test` | Run the tests (uses an in-memory database) |
| `npm run build` | Build the frontend and bundle the server into `dist/` |
| `npm start` | Run the production build from `dist/` |
| `npm run db:generate` | Create a migration after changing `shared/schema.ts` |
| `npm run db:studio` | Browse the database at `DATABASE_URL` |

## Tech Stack
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: Postgres with Drizzle ORM
- Auth: Better Auth (email and password)
- State Management: Zustand, TanStack Query
- AI: OpenAI SDK (Groq free tier or OpenAI)
