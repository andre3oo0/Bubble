<p align="center">
  <img src="docs/images/banner.svg" alt="Bubble: a calm place to talk things through" width="100%">
</p>

<p align="center">
  An AI companion for talking things through, with a private journal, mood check-ins,<br>
  a breathing exercise, calming scenes and South African crisis helplines one tap away.
</p>

<p align="center">
  Made together by <a href="https://github.com/Immanah">Immanah Makitla</a> and <a href="https://github.com/andre3oo0">andre3oo0</a>.
</p>

<p align="center">
  <a href="https://bubble-1-kafq.onrender.com"><strong>Open Bubble</strong></a> ·
  <a href="docs/HANDOVER.md">Handover</a> ·
  <a href="docs/SAFETY.md">Safety and privacy</a> ·
  <a href="docs/DEPLOYMENT.md">Deployment</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/andre3oo0/Bubble/actions/workflows/ci.yml"><img src="https://github.com/andre3oo0/Bubble/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/andre3oo0/Bubble/releases"><img src="https://img.shields.io/github/v/release/andre3oo0/Bubble?color=0b5394&label=release" alt="Latest release"></a>
  <a href="https://bubble-1-kafq.onrender.com"><img src="https://img.shields.io/badge/live-onrender.com-0b6bb8" alt="Live site"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0b3d66" alt="MIT licence"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-0b3d66" alt="Node 20 or newer">
  <img src="https://img.shields.io/badge/installable-PWA%20%2B%20Android-0b3d66" alt="Installable as a PWA and Android app">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-20232a?logo=react&logoColor=61dafb" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white" alt="Vite 6">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3">
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express 4">
  <img src="https://img.shields.io/badge/PostgreSQL-Drizzle-4169e1?logo=postgresql&logoColor=white" alt="PostgreSQL with Drizzle">
  <img src="https://img.shields.io/badge/Vitest-tested-6e9f18?logo=vitest&logoColor=white" alt="Tested with Vitest">
</p>

> **Need to talk to someone now?** In South Africa, call the SADAG Suicide Crisis Line on **0800 567 567** (24 hours, free) or Lifeline on **0861 322 322** (24 hours). In an emergency, call **112**. Bubble is an AI and isn't a substitute for a therapist.

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/images/phone-welcome.png" width="200" alt="Welcome page with sign-in options"><br><sub>Welcome, with optional sign-in</sub></td>
    <td align="center"><img src="docs/images/phone-chat.png" width="200" alt="A conversation with Bubble"><br><sub>Chat</sub></td>
    <td align="center"><img src="docs/images/phone-journal.png" width="200" alt="Journal entries"><br><sub>Private journal</sub></td>
    <td align="center"><img src="docs/images/phone-help.png" width="200" alt="Get help screen with helplines"><br><sub>Get help, from every screen</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/phone-home.png" width="200" alt="Home screen at sunset"><br><sub>Home</sub></td>
    <td align="center"><img src="docs/images/phone-mood.png" width="200" alt="Mood check-in and history"><br><sub>Mood check-ins</sub></td>
    <td align="center"><img src="docs/images/phone-menu.png" width="200" alt="Menu with scene picker"><br><sub>Menu and scenes</sub></td>
    <td></td>
  </tr>
</table>

<p align="center">
  <img src="docs/images/desktop-journal.png" width="860" alt="Bubble on desktop: sidebar and journal">
</p>

## What it does

- **Chat with Bubble.** A warm AI companion that listens first, comforts before it advises, and answers honestly when asked. Works without an account.
- **Crisis safety that doesn't depend on the AI.** A keyword check runs on the server and in the browser, so a message about suicide or self-harm always gets the helplines, even when the AI is down, the daily limit is reached, or the phone is offline. The help screen is one tap away on every page.
- **End-of-chat choices.** "I'm done for now" offers to let the conversation go, reflect on it, or save a short reflection to the journal.
- **Private journal.** Writing prompts, search, delete with undo, a warning before unsaved writing is lost, and "Reflect with Bubble" on any entry. Only the person who wrote it can read it.
- **Mood check-ins** with a history of the last 30 days, and the latest one on the home screen.
- **Breathing exercise.** A slow 4-4-6-2 pace, with a longer out-breath.
- **Calming scenes.** Ocean, forest, sunset and a cozy room, drawn in SVG, with ambient sound generated in the browser. Calm visuals turns off movement.
- **Accounts that stay optional.** Email and password or Google. Download or delete everything at any time. A plain-language [privacy policy](https://bubble-1-kafq.onrender.com/privacy) and [terms of use](https://bubble-1-kafq.onrender.com/terms) say what's kept and why.
- **Feedback by email.** The feedback form opens your own email app, so Bubble's server never stores it.
- **Installable.** Works as a PWA with an offline helplines page, and as an Android app.

## How it works

```mermaid
flowchart LR
  A[Browser or Android app] -->|/api| B[Express server]
  B --> C[(Postgres<br/>Neon in production,<br/>PGlite locally)]
  B --> D[AI model<br/>Groq or OpenAI]
  B --> E[Email<br/>Brevo or Resend]
  A -. crisis keyword check<br/>also runs here .-> A
```

One Node process serves the API and the React app. Chat is stateless apart from a short in-memory context; journal entries, moods and accounts are in Postgres. The AI returns structured replies (reply, mood, risk), and the server's own crisis check always has the last word. More detail, and the reasons behind each decision, is in the [handover](docs/HANDOVER.md).

| Layer | Built with |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Radix UI, Zustand, TanStack Query, framer-motion |
| Backend | Node 20+, Express 4, Better Auth |
| Database | Postgres with Drizzle ORM; PGlite (embedded Postgres) locally and in tests |
| AI | OpenAI SDK against Groq's free tier (`qwen/qwen3.8-27b`), or OpenAI |
| Email | Brevo HTTP API, or Resend |
| Tests | Vitest, with an in-memory database and mocked AI and email |
| Hosting | Docker on Render, Neon Postgres, UptimeRobot, GitHub Actions CI |

## Quick start

You need Node.js 20 or newer. No database server is needed locally.

```bash
git clone https://github.com/andre3oo0/Bubble.git
cd Bubble
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5000. The dev server only accepts connections from your own computer (set `HOST=0.0.0.0` in `.env` to try it from a phone on a network you trust). Without an AI key, chat answers with gentle canned replies and everything else works. For real replies, add a free [Groq](https://console.groq.com/keys) key to `.env`:

```bash
OPENAI_API_KEY=your_groq_key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=qwen/qwen3.8-27b
```

The local database lives in `.data/pglite`; delete that folder to start fresh. Migrations run on startup. Every setting is explained in [`.env.example`](.env.example).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (API and frontend on one port) |
| `npm run check` | Type-check the whole project |
| `npm test` | Run the tests (in-memory database, no real services) |
| `npm run build` | Build the frontend and bundle the server into `dist/` |
| `npm start` | Run the production build |
| `npm run try-chat` | Run scripted conversations against the live site (or a URL you pass) and print Bubble's replies |
| `npm run screenshots` | Retake the README screenshots from a local server (uses your installed Chrome) |
| `npm run db:generate` | Create a migration after changing `shared/schema.ts` |
| `npm run db:studio` | Browse the database at `DATABASE_URL` |

## Project layout

```
client/src/
  pages/        Home (the app shell for phone and desktop), ResetPassword, not-found
  components/   Chat, journal, mood, settings, help screen, scenes, intro, menu
  store/        Small Zustand stores (mood, help screen, sound, preferences, account)
  lib/          API calls, auth client, breathing timings, generated sound, moods
client/public/  Manifest, icons, service worker and the offline helplines page
server/         Express app, routes, AI calls, auth, usage limits, email, database
shared/         Database schema, request and response types, crisis safety
migrations/     SQL migrations, applied automatically on startup
scripts/        try-chat, for judging how Bubble talks
docs/           Handover, deployment, safety and privacy, images
```

## Documentation

| Document | For |
|---|---|
| [Handover](docs/HANDOVER.md) | What Bubble is, architecture, decisions and why, gotchas, current state and the work list |
| [Safety and privacy](docs/SAFETY.md) | How crisis handling works, what's stored and what isn't |
| [Deployment](docs/DEPLOYMENT.md) | Running it on the free stack: Render, Neon, Groq, Brevo, Google sign-in, Android |
| [Contributing](CONTRIBUTING.md) | Branches, checks, commit style and the rules every change follows |
| [Security](SECURITY.md) | How to report a vulnerability |

## Who makes Bubble

Bubble is a shared project by [Immanah Makitla](https://github.com/Immanah) and [andre3oo0](https://github.com/andre3oo0). It belongs to both of them: the vision comes from the design document Immanah wrote, and they build the app together. Bubble's earliest history is in [Immanah/BubbleBackend](https://github.com/Immanah/BubbleBackend), where the project started.

## License

[MIT](LICENSE), © 2025-2026 Immanah Makitla and andre3oo0.
