
# Bubble - Mental Health & Emotional Support Platform

## Setup Instructions

Requires Node.js 20 or newer.

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and add your OpenAI key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

The application will start on http://localhost:5000 (set `PORT` in `.env` to change it).

Locally you don't need a database server. Without `DATABASE_URL` the app uses an embedded Postgres (PGlite) stored in `.data/pglite`; delete that folder to start fresh. Migrations run automatically on startup.

## Production

Set `DATABASE_URL` (any Postgres, e.g. Neon or Supabase), `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. The server refuses to start without the first two.

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
- AI: OpenAI GPT
