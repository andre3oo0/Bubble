# Bubble handover

Status as of 5 October 2026. Read this before changing anything.

## What Bubble is

An emotional-support web app: an AI chat companion ("Bubble") with crisis safety, a private journal, mood check-ins, a breathing exercise, calming scenes with ambient sound, and an SOS screen with South African helplines. The product vision is in Immanah's design document (the PDD); this repo is at roughly its Phase 1 (MVP).

## Where the code came from

- Original app: **Immanah/BubbleBackend** (Immanah Makitla). Despite the name it's the whole app, frontend and backend. Left untouched.
- This repo: **andre3oo0/Bubble** (private). Cloned from hers, history kept. Her repo is the `upstream` remote, fetch only; pushing to it is disabled on purpose.
- An earlier Python/Flask backend (`andre3oo0/Bubble`, first version) was deleted. Everything is TypeScript now.

## Stack

| Layer | What |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind, Radix dialog, Zustand, TanStack Query, framer-motion, wouter |
| Backend | Node (20+, developed on 24), Express 4, one process serving API and frontend |
| Database | Postgres via Drizzle ORM. Locally and in tests: PGlite (embedded Postgres, nothing to install) |
| Auth | Better Auth, email and password, sessions in Postgres |
| AI | OpenAI SDK. Live: Groq free tier, `openai/gpt-oss-120b`, via `OPENAI_BASE_URL`. Unset that and the model for OpenAI (`gpt-4.1-mini` default) |
| Email | Brevo HTTP API (free, verified sender, no domain) or Resend; console output when neither is configured |
| Tests | Vitest (116 tests), in-memory database, AI and email mocked |
| Deploy | Render free web service (Docker, Frankfurt), Neon free Postgres (Frankfurt), UptimeRobot pings `/api/health` so it doesn't sleep. GitHub Actions CI (check, test, build) |

## Layout

```
client/src/
  pages/        Home (whole app shell, phone + desktop layouts), ResetPassword, not-found
  components/   ChatPanel, JournalPanel, MoodPanel, AvatarPanel (= Settings tab), SosScreen,
                BreathingExercise, AuthenticationModal (account dialog), BubbleAvatar, BubbleLogo,
                SceneBackdrop (the drawn scenes), scenes.ts (scene names), IntroTour (first-visit walkthrough)
  store/        Zustand: mood (shared app mood), sos, sound, preferences, account dialog, chat
  lib/          api.ts, chatService.ts, authClient.ts, audioHandler.ts (generated ambient sound),
                breathing.ts, motion.ts
server/
  index.ts      startup: migrations, app, Vite (dev) or static files (prod), graceful shutdown
  app.ts        Express app: proxy trust, helmet, auth handler, logging, routes, JSON 404
  routes.ts     /api/chat (+ fallback replies, usage cap), scenes, affirmation
  dataRoutes.ts journal, moods, data export (all need a session)
  auth.ts       Better Auth config, requireUser middleware
  openaiService.ts  the AI call: one structured reply {reply, user_mood, risk}
  usage.ts      daily chat counter, email.ts transactional email, db.ts database
shared/
  schema.ts     Drizzle tables (server only), api.ts / chat.ts request + response types,
  safety.ts     crisis keyword check, helplines, crisis reply (used by client AND server)
migrations/     generated SQL, applied automatically on startup
```

## Running it

```bash
npm install
npm run dev        # http://localhost:5000, needs OPENAI_API_KEY in .env
npm test
npm run check      # type-check
npm run build && npm start
```

`.env.example` documents every setting. The owner's local `.env` has a Groq key and its own `BETTER_AUTH_SECRET`. Without a key the app still runs and chat uses canned fallback replies.

## API

| Route | Notes |
|---|---|
| `POST /api/chat/reflect` | `{transcript}` → `{title, summary, takeaway, helplines?, fallback?}`. The debrief's reflection; counts towards the daily limit |
| `POST /api/chat/end` | `{sessionId}` → 204. "Let go": forgets the server's copy of the chat |
| `POST /api/chat` | `{message, sessionId?}` → `{reply, mood, risk, sessionId, helplines?, fallback?, limited?}`. Works signed out. |
| `GET/POST /api/journal`, `PATCH/DELETE /api/journal/:id` | Signed in only, always scoped to the session's user |
| `POST /api/journal/:id/reflect` | → `{reflection, question, helplines?, fallback?}`. "Reflect with Bubble" on one of your own entries; counts towards the daily limit, nothing stored |
| `GET/POST /api/moods` | Check-ins, last 30 days by default |
| `GET /api/me/export` | JSON download of everything stored for the user |
| `/api/auth/*` | Better Auth: sign up/in/out, request-password-reset, reset-password, verify-email, delete-user |
| `GET /api/health` | Health check |

## Decisions worth knowing (and why)

- **Crisis safety never depends on the AI.** A keyword check (`shared/safety.ts`) runs on the server and, if the network fails, in the browser. A crisis message always gets the helplines, even when the AI is down or the user is over the daily limit. The SOS screen opens automatically on the first crisis message of a visit.
- **Bubble talks like a friend, not an interviewer** (system prompt in `openaiService.ts`). It answers direct questions with an honest view, gives something back each turn, doesn't parrot ("It sounds like…"), asks a question only when it wants to know more, and offers breathing or journaling only when it fits. Two worked examples in the prompt show the difference. Signed-in people's display name is passed in so Bubble can use it occasionally. Reasoning models (gpt-oss) run with `reasoning_effort: medium`; on low they followed the style rules noticeably worse.
- **Mood comes from the user's words**, classified by the model in the same call as the reply. Bubble's own replies never change the mood.
- **The post-chat debrief** ("I'm done for now" in chat, `ChatDebrief.tsx`): Let go clears the chat and the server's context; Reflect asks the AI for a short summary; Save to journal stores that reflection, editable first, and asks signed-out people to make an account. The client sends the transcript it shows (capped server-side at the most recent ~12,000 characters) because the server only keeps 10 turns. Crisis words anywhere in what the person said add the helplines, even when the AI is down or over the limit.
- **Journal deletes wait 6 seconds** (`journalDeleteStore.ts`): the entry is hidden at once and only deleted on the server when the undo window ends. Closing the app inside that window keeps the entry, which is the safe way round.
- **Journal prompts and reflections.** A new entry offers a hand-written prompt (`journalPrompts.ts`, no AI). "Reflect with Bubble" on a saved entry sends that entry to the AI only when tapped and keeps the reply only if the person adds it to the entry. Crisis words in the entry add the helplines.
- **Chat history isn't stored.** Only the last 24 messages (at most about 8,000 characters) are kept in server memory per conversation for context, cleared after an hour idle. Logs never contain chat or journal content.
- **Chat works without an account**; journal and mood history need one. Crisis support shouldn't sit behind a sign-up.
- **Email confirmation is sent but not required**, so nobody is locked out of support. Password reset signs out every other session.
- **Daily AI cap** (150 per user, 40 per guest, 20 per minute; all configurable). Guests are counted by a keyed hash of their IP, never the raw IP. A limit of 0 is valid.
- **Ambient sound is generated with the Web Audio API**, not audio files: no hosting, licensing or data cost. It only plays when the user presses play.
- **Calm visuals** (reduced motion) follows the device setting or an in-app switch. The breathing circle keeps moving because it is the exercise.
- **Colours were deepened for contrast** (WCAG AA). `client/src/lib/contrast.test.ts` fails if a low-contrast pair comes back, including the scene skies.
- **Scenes are drawn as one inline SVG each** (`SceneBackdrop.tsx`): no image files to host. The drawing is cropped to fill and anchored to the bottom, so phones only see the middle; keep the interesting part near the centre. Night swaps the sun for a moon and stars and dims the drawing, instead of covering it in navy.
- **No "vibe-coded" UI**: no purple, neon accents, decorative glows or arbitrary shadows, cards inside cards, emoji icons or meaningless status dots. Moods are words with muted colours (`client/src/lib/moods.ts`, contrast-tested). Only the floating breathing button and dialogs have shadows.
- **Panels use neutral frosted glass** (`surface`, `surface-soft`, `surface-bar` in `index.css`) so they read on every scene. Don't bring back blue-tinted panels; they only suited the ocean.
- **Zero-cost hosting until funded**: Groq, Neon, Brevo, Render and UptimeRobot free plans, no card on file. Groq was picked over Gemini's free tier because Google may use free-tier prompts to improve its products, which is wrong for health conversations. Going back to OpenAI is a settings change.
- **The introduction shows once per device** (remembered in local storage, `introStore.ts`) and can be replayed from the home screen or Settings. It has its own SOS button because it covers the header.
- **Installable, with an offline helplines page.** `client/public` has the manifest, icons (drawn from the logo) and `sw.js`. The worker caches only `offline.html`; the app and API always come from the network, so deploys show up straight away. `offline.html` repeats the helplines as plain HTML; `offline.test.ts` fails if it drifts from `shared/safety.ts`.
- **Android app = the live site in a Trusted Web Activity**, packaged with PWABuilder (free). It updates with every deploy, no new APK needed. `/.well-known/assetlinks.json` proves the APK and the site belong together; without it the app shows a browser bar. It serves the current APK's details (built into `server/app.ts`), overridable with `ANDROID_PACKAGE_NAME` and `ANDROID_CERT_SHA256`. The APK is tied to the address it was built for: moving to a custom domain means rebuilding it. Keep the signing key from PWABuilder's zip safe, since updates to an installed app must be signed with the same key.
- **The mic button was removed**: it did nothing, and browser speech recognition sends audio to a third party, which needs consent first.

## Gotchas

- **`useQueryClient()` in components**, not the `queryClient` import. (A dev-server cache-buster once loaded the module twice; it's removed, but the hook is the safe pattern.)
- **Express 4 doesn't catch rejected promises.** Async routes go through the `handle()` wrapper in `dataRoutes.ts`.
- **Better Auth must be mounted before `express.json()`**, and it gets the client IP from the `x-bubble-client-ip` header that `app.ts` sets from `req.ip`. Without that, login rate limits are one bucket for everyone.
- **The server bundle is split** (`esbuild --splitting`) so production never loads Vite. Keep the dynamic `import("./vite")` in `index.ts`.
- **Tests:** the database and password hashing are slow when test files run in parallel, hence the raised timeouts in `vitest.config.ts`. `routes.test.ts` and `data.test.ts` run migrations in `beforeAll`.
- **Schema changes:** edit `shared/schema.ts`, run `npm run db:generate`, commit the new migration.
- **Windows:** npm 11 blocks some install scripts (esbuild's check, bufferutil); nothing needed them.
- Old saved scene `"cafe"` is mapped back to ocean (`isSceneId` in `scenes.ts`).
- **Startup waits for the database**, with a 15s connect timeout and 4 tries, then exits with the reason (`index.ts`). A deploy that fails with "no open ports" after 15 minutes means something hung before `listen`; the `[startup]` log lines show where.
- **Local dev won't start after a killed server** if `.data/pglite/postmaster.pid` is left behind (startup hangs with no output). With no `node` process running, delete that file.
- **Screenshots with the preview pane hidden:** framer-motion fades freeze part-way, so text looks faded. That's the capture, not the page.

## Workflow

- One branch per piece of work, merged to `main` with fast-forward only, then pushed.
- Commit messages: short, lowercase, imperative, no lists or emoji.
- `main` history so far: startup fixes → chat logic → SOS → database + login → phone layout → polish.

## Current state

Live at `https://bubble-1-kafq.onrender.com` on the free stack. Checked on 5 October 2026: health check, a normal chat reply from Groq (mood detected) and a crisis message (crisis risk, 3 helplines). Brevo email, the redrawn scenes and the startup fix were live by 10:36 the same day. The first-visit introduction is on branch `feat/intro`. A custom domain (`bubblementalhealth.com`) was started in Render but isn't registered yet.

## Before launch (owner's tasks)

- [x] Free accounts: Groq, Neon, Brevo, Render, UptimeRobot
- [ ] Sign up on the live site, confirm the email arrives, try a password reset
- [ ] Check Groq's free limits for `openai/gpt-oss-120b` (console.groq.com, Settings → Limits) and lower `CHAT_DAILY_LIMIT_*` if needed
- [ ] When funded: OpenAI credit, a monthly budget, separate local and production keys
- [ ] Check SADAG and Lifeline numbers in `shared/safety.ts` against their sites
- [ ] Immanah's OK to launch, including the deeper colours
- [ ] Privacy notice (POPIA: health-related data, stored in Frankfurt, chat sent to Groq)
- [ ] On a real phone: breathing circle with calm visuals on

## UI/UX redesign plan

From the owner's design handoff, `Bubble UIUX improvements.zip` (5 October 2026, kept outside the repo): a 16-point audit and redesigned screens (`Bubble Redesign.dc.html`) plus design tokens. The direction: flat white and pale-blue surfaces with navy text, one orange accent for focus, Montserrat headings, Nunito Sans body, 4 px corners on controls, hairline-divided lists, no blur, glow or decorative motion. Bubble keeps its own name; no Curro logo or name appears.

**Done:** chat errors as notices with Retry (08), the growing message box with typing dots and time labels (09), the "Bubble is an AI" line on the home screen and in chat (14), journal delete with a confirmation and 6-second undo (10), and an optional journal title plus search (11).

**Ready to build (no open questions):**
- Skeleton loading rows, an in-app offline banner that keeps helplines reachable, a proper 404 (16)
- Desktop: a 240 px labelled sidebar with a permanent "Get help now", content capped at 720 px (05). Phone: five tabs with 12 px labels, a simpler header, breathing moved into chat and the help screen instead of a floating button (06)
- Settings: drop setting Bubble's mood by hand, hide reminder times until reminders exist, and bring account, privacy, safety and display into one screen (07); controls lose the pill shape except switches (04); remove the rising mood bubbles and keep Bubble's face still (03)

**Owner's decisions (5 October 2026):**
- **Styling:** the same flat style, but in Bubble's own colours, not Curro's palette or fonts
- **Scenes:** keep the drawn, animated scenes
- **Past chats:** yes. Optional chat history, off by default, kept 30 days. Needs a privacy-notice update (POPIA, health data), a database table, deletion after 30 days and isolation tests
- **Helplines:** South Africa only for now. Another country is added only once a person has checked its numbers
- **Mood:** yes to a five-step scale with optional feeling tags and a 14-day view. Existing check-ins get mapped onto the scale

## Outstanding work

**Next (Phase 1 gaps from the design doc, cheap because the pieces exist):**
1. Dynamic Ambiance Engine: mood drives the background colours and motion
2. Sensory Calibration onboarding (sound or silence, motion, theme) feeding the existing settings
3. Add anger and overwhelm as moods
4. Mirror Moment: grounding overlay on the model's "concern" risk level
5. Streaming replies
6. A rain sound
7. Affirmations tab: the component exists (`AffirmationsTab.tsx`) but isn't linked and needs a real backend
8. Mood trend chart

**From testing the APK (owner, 5 October):**
- Sign-up was hard to find: now a labelled "Sign in" button in the header and sidebar, plus "Create a free account" on the home screen. Worth asking testers whether it's clear enough now
- The APK showed a browser bar because the site didn't serve its verification file. The current APK's package name and fingerprint are now built into `server/app.ts`, so it opens full screen. The owner wants it to feel like a real app later, not the website in a wrapper

**Known loose ends:**
- `index.css` still has the old scenery styles (cafe, rain, stars, lamp, the CSS trees and clouds). Nothing uses them; they can be deleted
- Feedback form only logs to the browser console
- Mood check-in reminder times are saved but nothing is sent (needs notifications)
- `ChatInterface` renders a second `BreathingExercise` alongside the one in Home
- `POST /api/environment/change` is unused
- Google sign-in needs OAuth credentials
- Journal encryption at rest (field level) not done; the PDD's end-to-end encryption isn't compatible with server-side AI as designed

**Later phases (not started):** community, wearables, sleep system, AR, Orrery, Chronicle, smart home, Teams, therapist portal, monetisation, analytics and safety metrics.
