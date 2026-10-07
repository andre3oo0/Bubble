# Bubble handover

Status as of 7 October 2026. Read this before changing anything. The README is the public overview; [SAFETY.md](SAFETY.md) and [DEPLOYMENT.md](DEPLOYMENT.md) cover crisis handling, privacy and hosting in detail.

## What Bubble is

An emotional-support web app: an AI chat companion ("Bubble") with crisis safety, a private journal, mood check-ins, a breathing exercise, calming scenes with ambient sound, and a help screen with South African helplines. The product vision is in Immanah's design document (the PDD); this repo is at roughly its Phase 1 (MVP).

## Who makes it, and where the code lives

Bubble is a shared project by **Immanah Makitla** and **andre3oo0**, and it's both of theirs. Present it that way everywhere (README, release notes, anything public): a collaboration, not one person continuing the other's work. MIT licence, © 2025-2026 both.

- **Immanah/BubbleBackend**: where the project started. Despite the name it's the whole app, frontend and backend. Kept as it was.
- **andre3oo0/Bubble** (public): where the project lives now, with the full history. Immanah's repo is the `upstream` remote, fetch only; pushing to it is disabled on purpose.
- An earlier Python/Flask backend (`andre3oo0/Bubble`, first version) was deleted. Everything is TypeScript now.

## Stack

| Layer | What |
|---|---|
| Frontend | React 18, Vite 6, TypeScript, Tailwind, Radix dialog, Zustand, TanStack Query, framer-motion, wouter |
| Backend | Node (20+, developed on 24), Express 4, one process serving API and frontend |
| Database | Postgres via Drizzle ORM. Locally and in tests: PGlite (embedded Postgres, nothing to install) |
| Auth | Better Auth: email and password, plus Google when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set. Sessions in Postgres |
| AI | OpenAI SDK. Live: Groq free tier, `qwen/qwen3.8-27b` (best-effort structured outputs, checked by `parseBestEffort`), via `OPENAI_BASE_URL`. Unset that and the model for OpenAI (`gpt-4.1-mini` default) |
| Email | Brevo HTTP API (free, verified sender, no domain) or Resend; console output when neither is configured |
| Tests | Vitest 4 (189 tests), in-memory database, AI, email and the breached-password check mocked |
| Deploy | Render free web service (Docker, Frankfurt), Neon free Postgres (Frankfurt), UptimeRobot pings `/api/health` so it doesn't sleep. GitHub Actions CI (check, test, build) |

## Layout

```
client/src/
  pages/        Home (whole app shell, phone + desktop layouts), ResetPassword, Legal (privacy policy
                and terms of use, at /privacy and /terms), not-found
  components/   ChatPanel, ChatDebrief (end-of-chat choices), JournalPanel, EntryReflection
                ("Reflect with Bubble"), MoodPanel, SettingsPanel (the Settings tab), SosScreen,
                BreathingExercise, AuthenticationModal (account dialog), BubbleAvatar (Bubble's face), BubbleLogo,
                SceneBackdrop (the drawn scenes), scenes.ts (scene names), IntroTour (first-visit walkthrough),
                OfflineBanner, Skeleton (loading placeholders), PhoneMenu (account, Settings, Feedback on phones),
                GoogleButton, PageHeader (every screen's title, back arrow and one action), HelplineList (the
                one way helplines are drawn), EmptyState
  components/ui/ controls.ts (the shared button, field, chip and dialog styles: use these, don't restyle),
                dialog and toast (Radix)
  store/        Zustand: mood (shared app mood), sos, breathing (the one breathing exercise), sound, preferences,
                account dialog, chat, intro (seen once), journalDelete (6-second undo)
  lib/          api.ts, chatService.ts, online.ts (browser's online flag), googleSignIn.ts, authClient.ts, audioHandler.ts (generated ambient sound),
                breathing.ts, motion.ts, moods.ts (labels and muted colours), journalPrompts.ts, dates.ts (en-ZA dates
                and 24-hour times everywhere), feedback.ts (the feedback email link)
client/public/  manifest, favicon.svg and PNG icons (from the logo), sw.js (service worker), offline.html (helplines with no connection)
server/
  index.ts      startup: migrations, app, Vite (dev) or static files (prod), graceful shutdown
  app.ts        Express app: proxy trust, helmet, auth handler, logging, routes, JSON 404
  routes.ts     /api/chat (+ fallback replies, usage cap), scenes, affirmation
  dataRoutes.ts journal, moods, data export (all need a session)
  auth.ts       Better Auth config, requireUser middleware
  openaiService.ts  the AI calls: chat reply {reply, user_mood, risk}, chat reflection, entry reflection;
                strict structured outputs for GPT models, best-effort plus parseBestEffort() for others
  usage.ts      daily counters and limits (AI per person and app-wide, emails, failed sign-ins)
  email.ts      transactional email, passwordCheck.ts breached-password check, log.ts (describeError), db.ts database
shared/
  schema.ts     Drizzle tables (server only), api.ts / chat.ts request + response types,
  safety.ts     crisis keyword check, helplines, crisis reply (used by client AND server)
migrations/     generated SQL, applied automatically on startup
scripts/        try-chat.mjs: scripted conversations against a server, to judge how Bubble talks;
                screenshots.mjs: retakes the README images from a local server
docs/           HANDOVER (this), SAFETY (crisis handling, privacy), DEPLOYMENT (free stack, Android),
                images/ (README banner and screenshots)
README.md, CONTRIBUTING.md, SECURITY.md, LICENSE (MIT)   public overview, contributor rules, vulnerability reports
```

## Running it

```bash
npm install
npm run dev        # http://localhost:5000, needs OPENAI_API_KEY in .env
npm test
npm run check      # type-check
npm run build && npm start
npm run try-chat   # five test conversations against the live site; prints Bubble's replies
npm run screenshots -- http://localhost:5055   # retake README images (local server only)
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
| `GET /api/me/export` | JSON download of everything stored for the user: account, consent record, journal, moods, sign-in methods, sessions |
| `POST /api/me/consent` | `{version}` → 204. Agree to the current terms and privacy policy; only `LEGAL_VERSION` is accepted |
| `/api/auth/*` | Better Auth: sign up/in/out, request-password-reset, reset-password, verify-email, delete-user |
| `GET /api/health` | Health check |
| `GET /api/auth-options` | `{google}`: whether to show "Continue with Google" |

## Decisions worth knowing (and why)

- **Crisis safety never depends on the AI.** A keyword check (`shared/safety.ts`) runs on the server and, if the network fails, in the browser. A crisis message always gets the helplines, even when the AI is down or the user is over the daily limit. The help screen (`SosScreen.tsx`) opens automatically on the first crisis message of a visit.
- **Bubble talks like a caring friend, not an interviewer** (system prompt in `openaiService.ts`). Compassion comes first when someone is hurting: it says it's sorry, that the feeling makes sense and that they're not alone, before anything else, and it's never clever or jokey about pain. It answers direct questions honestly, doesn't parrot ("It sounds like…"), asks few questions (in heavy moments it reassures instead), and offers breathing or journaling only when it fits. Four worked examples set the tone. Signed-in people's display name is passed in so Bubble can use it occasionally. GPT-OSS models get `reasoning_effort: medium` (on low they followed the style rules noticeably worse); other models get no reasoning setting. Tester feedback (6 October) was that earlier, wittier versions felt short on compassion for a "safe space".
- **The canned replies** (AI down) can't know what was said, so they're gentle and open and never assume; loss words ("passed away", "funeral") always count as sad.
- **Mood comes from the user's words**, classified by the model in the same call as the reply. Bubble's own replies never change the mood.
- **The post-chat debrief** ("I'm done for now" in chat, `ChatDebrief.tsx`): Let go clears the chat and the server's context; Reflect asks the AI for a short summary; Save to journal stores that reflection, editable first, and asks signed-out people to make an account. The client sends the transcript it shows (capped server-side at the most recent ~12,000 characters) because the server only keeps the last 24 messages, and nothing after an hour or a restart. Crisis words anywhere in what the person said add the helplines, even when the AI is down or over the limit.
- **Journal deletes wait 6 seconds** (`journalDeleteStore.ts`): the entry is hidden at once and only deleted on the server when the undo window ends. Closing the app inside that window keeps the entry, which is the safe way round.
- **Journal prompts and reflections.** A new entry offers a hand-written prompt (`journalPrompts.ts`, no AI). "Reflect with Bubble" on a saved entry sends that entry to the AI only when tapped and keeps the reply only if the person adds it to the entry. Crisis words in the entry add the helplines.
- **Chat history isn't stored.** Only the last 24 messages (at most about 8,000 characters) are kept in server memory per conversation for context, cleared after an hour idle. Logs never contain chat or journal content.
- **Problems aren't put in Bubble's mouth.** A message that can't be sent is marked "Not sent" with Retry; rate limits and the daily limit are plain notices. The one exception is a crisis message with no connection: it still gets Bubble's crisis reply and the helplines, from the browser.
- **Bubble says it's an AI**, on the home screen and at the top of every chat, and that it isn't a substitute for a therapist, and where to get help if they're in danger. The owner chose this wording (6 October): "Bubble is an AI and isn't a substitute for a therapist. If you're in danger…". Earlier versions ("isn't a therapist and can't respond to emergencies") read as harsh.
- **Breathing is 4 in, 4 hold, 6 out, 2 rest** (`breathing.ts`): the longer out-breath is the calming part. 4-2-4-2 felt rushed to testers.
- **Chat works without an account**; journal and mood history need one. Crisis support shouldn't sit behind a sign-up.
- **Sign-in comes first, but is optional.** The first page of the first-visit introduction offers "Continue with Google", "Continue with email" and "Not now, show me around". Neither sign-in route counts as finishing the introduction, so it picks up again afterwards ("Hi Sam, I'm Bubble"). Chat never needs an account.
- **Google sign-in** (free) is switched on by the two `GOOGLE_*` settings; without them the button doesn't show. It always shows Google's account chooser (shared phones), stores Google's tokens encrypted, and asks only for name and email. An existing email account is linked to Google only once its email is confirmed, so an unconfirmed sign-up can't be taken over; the person is told to use their password instead. Google-only accounts have no password, so "Change password" is hidden and deleting needs a sign-in from the last 24 hours instead. Google sign-in leaves the page, so it's hidden in the chat debrief, where it would lose the reflection. Apple (US$99/year) and phone numbers (paid per SMS) are parked until Bubble is funded.
- **Email confirmation is sent but not required**, so nobody is locked out of support. Password reset signs out every other session.
- **Privacy policy and terms of use** (6 October, owner's decisions): pages at `/privacy` and `/terms` (`pages/Legal.tsx`), with the version, date, contact and the Information Regulator's details in `shared/legal.ts`. The pages say "Bubble" throughout and name no people (owner's choice, 6 October). Bubble is 18+. Email sign-up needs a tick box ("I'm 18 or older and I agree…"); the server refuses sign-up without the current version and records version and time on the user (`terms_version`, `terms_accepted_at`, migration 0003, never settable by the client). Signed-in people without the current version (Google sign-ups, older accounts, everyone after `LEGAL_VERSION` changes) get `ConsentGate`, which can only be agreed to or signed out of. Signed-out chat shows a note before the first message ("By sending a message you agree…"), remembered on the device. It's a passive note, not a button, so nobody in crisis has to tap through anything first. Change the pages, then bump `LEGAL_VERSION` if people should agree again.
- **Sign-up doesn't sign in by itself** (`autoSignIn: false`), so it answers the same whether or not the email has an account and can't be used to check who uses Bubble. The account dialog signs in straight after with the new password; if that fails it says "If you already have one, sign in instead, or reset your password", and the real owner gets an email saying someone tried. This makes checking slower and noisy, not impossible: someone who signs up and then signs in can still tell, at the cost of creating an account and emailing the address. Only requiring email confirmation before first sign-in would close it fully, which the owner decided against for now.
- **Security audit, 6 October** (local file, not committed). Fixed: the dev server listens on 127.0.0.1 with Vite 6's host check on and a block on `.env` and key files; errors are logged by kind only, never the error object; session rows don't keep IPs or browsers (cleared by migration 0002, expired ones pruned hourly); names (50 characters, no links) are kept out of emails; at most 3 emails per address a day and an app-wide email budget; IPv6 guests counted per /56; an app-wide AI budget; per-person caps on journal and mood writes; 10-character passwords checked against Have I Been Pwned (fails open, production only); 5 wrong passwords per email per 15 minutes; an Origin check on API writes; `Cache-Control: no-store` on `/api`; a Permissions-Policy; no Google Fonts (Inter was loaded but never used); sign-out clears the chat and mood on the device; more crisis phrasings; CI runs `npm audit` with a read-only token. Not done: optional two-factor sign-in, Cloudflare Turnstile on sign-up, a check on the AI's own replies, field-level journal encryption.
- **Daily AI cap** (150 per user, 40 per guest, 20 per minute, 900 for the whole app via `AI_DAILY_LIMIT`; all configurable). Signed-out people are counted per device (6 October): the browser makes a random ID (`client/src/lib/deviceId.ts`, local storage, cleared on sign-out) and sends it in the `x-bubble-device` header; the server counts a keyed hash of it (40 a day) and also caps the whole network at 200 a day (`CHAT_DAILY_LIMIT_NETWORK`, keyed hash of the IP, IPv6 per /56), so fresh IDs can't get round it. No ID or a malformed one falls back to the network count at 40. Never the raw IP. A limit of 0 is valid. `try-chat` sends its own ID per run.
- **Ambient sound is generated with the Web Audio API**, not audio files: no hosting, licensing or data cost. It only plays when the user presses play.
- **Calm visuals** (reduced motion) follows the device setting or an in-app switch; when the device asks for less motion the switch shows on and can't be turned off in the app. The breathing circle keeps moving because it is the exercise. There's one breathing exercise for the whole app (`breathingStore`), a Radix dialog at the root, so Escape, focus and the tab bar behave.
- **Colours were deepened for contrast** (WCAG AA). `client/src/lib/contrast.test.ts` fails if a low-contrast pair comes back, including the scene skies.
- **Scenes are drawn as one inline SVG each** (`SceneBackdrop.tsx`): no image files to host. The drawing is cropped to fill and anchored to the bottom, so phones only see the middle; keep the interesting part near the centre. Night swaps the sun for a moon and stars and dims the drawing, instead of covering it in navy.
- **No "vibe-coded" UI**: no purple, neon accents, decorative glows or arbitrary shadows, cards inside cards, emoji icons or meaningless status dots. Moods are words with muted colours (`client/src/lib/moods.ts`, contrast-tested). Only dialogs have shadows; nothing floats over the page.
- **Panels use neutral frosted glass** (`surface`, `surface-soft`, `surface-bar` in `index.css`) so they read on every scene. Don't bring back blue-tinted panels; they only suited the ocean. `surface` is 46% navy (7 October, was 34%) so the sun or moon behind a panel doesn't bloom through as a glow. **Dialogs are never glass**: white (help screen, account, consent, confirmations) or the opaque navy sheet (`darkSheetClass`: intro, end of chat, breathing, phone menu).
- **One set of control styles** (`components/ui/controls.ts`, 7 October, from a UI/UX review): buttons in four kinds (primary blue `#0b6bb8`, secondary outline, tertiary text, danger red) for dark and light surfaces, fields with visible labels, mood chips, notices. 8 px corners on every control, panel and dialog; full rounding only for the switch, avatars, the breathing circle and the sheet's grab bar; 16 px for chat messages. Every screen starts with `PageHeader` (title left, back arrow left of it, one action right; focus moves to the title when the view changes). Helplines are always drawn by `HelplineList`. Dates and times always go through `lib/dates.ts` ("Today, 15:42", "Tue 6 Oct").
- **Chat on phones gives the conversation the room**: no visible title (the tab says where you are), the AI notice in the owner's full wording before the first message and one line after ("Bubble is an AI and isn't a substitute for a therapist. In danger? Tap Get help.", owner's choice 7 October), Breathe and I'm done for now as small outline buttons, Send the only filled button. Bubble's messages are its own fill colour, with its face beside the last message of each turn.
- **Bubble has its own mood**, shown on its face on Home and beside its chat messages (set by check-ins and by what the person says in chat). An always-calm face was tried on 7 October and the owner brought the mood back the same day. Home says "Hi Sam" or "Hi, I'm Bubble", and for signed-in people the last check-in and the journal, one tap each.
- **Journal editor** asks before losing unsaved writing (Cancel or back), and always starts a new entry blank. Mood check-ins start with nothing selected (never Bubble's guess from chat) and confirm with a toast.
- **Feedback goes by email** from the person's own email app (owner's choice, 7 October): the form fills in a `mailto:` to `LEGAL_CONTACT`. Bubble's server never sees it; the privacy policy and SAFETY.md say so.
- **Zero-cost hosting until funded**: Groq, Neon, Brevo, Render and UptimeRobot free plans, no card on file. Groq was picked over Gemini's free tier because Google may use free-tier prompts to improve its products, which is wrong for health conversations. Going back to OpenAI is a settings change.
- **The introduction shows once per device** (remembered in local storage, `introStore.ts`) and can be replayed from the home screen, Settings or the phone menu. It has its own help button because it covers the header.
- **Phones get four tabs** (Home, Chat, Journal, Mood). Settings, Feedback and the account sit behind the menu button in the header (`PhoneMenu`: a dark sheet that slides up, with the account at the top, a scene picker that changes the scene live behind it, a sound button, then the links), which is just the name, "Get help" and that menu. Nothing floats over the content: breathing is on Home, in Chat and on the help screen.
- **Desktop has one 240 px labelled sidebar** (Home, Chat, Journal, Mood, Settings, Feedback), a permanent "Get help" under the links, and the account (name and email, or "Sign in") at the bottom. Signed in, the account button (and the phone menu's account row) opens Settings, where everything about the account lives; the account dialog only handles signing in, the password and deleting. Content is centred and capped at 720 px. Bubble's face is on the Home screen on both phone and desktop, and stays still.
- **The help screen is flat and calm**: full screen on phones, the danger line (112) on its own with a red outline, then the helplines as plain rows. The buttons that open it say "Get help" in a quiet outline (`helpButtonClass` in `SosScreen.tsx`); red is only for the danger line.
- **Installable, with an offline helplines page.** `client/public` has the manifest, icons (drawn from the logo) and `sw.js`. The worker caches only `offline.html`; the app and API always come from the network, so deploys show up straight away. `offline.html` repeats the helplines as plain HTML; `offline.test.ts` fails if it drifts from `shared/safety.ts`.
- **Android app = the live site in a Trusted Web Activity**, packaged with PWABuilder (free). It updates with every deploy, no new APK needed. `/.well-known/assetlinks.json` proves the APK and the site belong together; without it the app shows a browser bar. It serves the current APK's details (built into `server/app.ts`), overridable with `ANDROID_PACKAGE_NAME` and `ANDROID_CERT_SHA256`. The APK is tied to the address it was built for: moving to a custom domain means rebuilding it. Keep the signing key from PWABuilder's zip safe, since updates to an installed app must be signed with the same key.
- **Offline, in the app too.** While the device is offline a banner on every screen says Bubble can't reply and gives SADAG's number plus an "All helplines" link to the help screen. Chat still lets you send: the message fails with Retry, and a crisis message still gets the helplines from the browser. The browser's online flag can say "online" on a network with no internet, so the banner is an early warning, not the only check.
- **Loading shows placeholder rows** shaped like the content (journal and mood history). Their pulse uses an `animated-` class, so calm visuals stops it.
- **The 404 page** has a way back and lists the helplines, so help is reachable even from a wrong link.
- **Bubble's face and logo** (6 October) come from the owner's design: a flat bubble with a face for each mood, plus "listening" and "thinking" (shown beside the typing dots). They're drawn in code (`BubbleAvatar.tsx`, `BubbleLogo.tsx`, colours in `BUBBLE_COLOURS`), not image files. The design arrived in Curro's colours, so it was recoloured to Bubble's: fill `#C9ECFF`, ring `#8CCBEB`, accent `#5BAEDC`, lines `#0B3D66`. The faces are still; only the rising mood bubbles in chat move. Exported design files can carry provenance metadata (a `<metadata>` block): strip it before anything goes in the repo. The favicon and app icons in `client/public` were regenerated from the new mark; the Android APK keeps its old launcher icon until it's rebuilt in PWABuilder with the same signing key.
- **The mic button was removed**: it did nothing, and browser speech recognition sends audio to a third party, which needs consent first.

## Gotchas

- **`useQueryClient()` in components**, not the `queryClient` import. (A dev-server cache-buster once loaded the module twice; it's removed, but the hook is the safe pattern.)
- **Express 4 doesn't catch rejected promises.** Async routes go through the `handle()` wrapper in `dataRoutes.ts`.
- **Better Auth must be mounted before `express.json()`**, and it gets the client IP from the `x-bubble-client-ip` header that `app.ts` sets from `req.ip`. Without that, login rate limits are one bucket for everyone.
- **Logging:** never `console.error(error)`. Use `describeError(error)` from `server/log.ts`: Drizzle's error message lists the query's parameters (a journal entry), and a JSON parse error quotes the text. Better Auth's own log details are dropped for the same reason.
- **The dev server only listens on 127.0.0.1.** To open it on a phone, set `HOST=0.0.0.0`, on a trusted network only. Sign-in then needs `BETTER_AUTH_URL` set to that address. Vite errors no longer stop the dev server.
- **The server bundle is split** (`esbuild --splitting`) so production never loads Vite. Keep the dynamic `import("./vite")` in `index.ts`.
- **Tests:** the database and password hashing are slow when test files run in parallel, hence the raised timeouts in `vitest.config.ts`. `routes.test.ts` and `data.test.ts` run migrations in `beforeAll`.
- **Schema changes:** edit `shared/schema.ts`, run `npm run db:generate`, commit the new migration.
- **Windows:** npm 11 blocks some install scripts (esbuild's check, bufferutil); nothing needed them.
- Old saved scene `"cafe"` is mapped back to ocean (`isSceneId` in `scenes.ts`).
- **Startup waits for the database**, with a 15s connect timeout and 4 tries, then exits with the reason (`index.ts`). A deploy that fails with "no open ports" after 15 minutes means something hung before `listen`; the `[startup]` log lines show where.
- **Local dev won't start after a killed server** if `.data/pglite/postmaster.pid` is left behind (startup hangs with no output). With no `node` process running, delete that file.
- **The owner's work network (Curro) blocks `api.groq.com`**, Groq's docs and plain HTTPS to the live site. On that network local chat always uses the fallback replies, and `npm run try-chat` can't connect. The in-app browser pane can reach the live site: run the conversations there with `fetch('/api/chat')` from the page.
- **`gh` defaults to this repo** (`gh repo set-default andre3oo0/Bubble`). Before that was set, `gh release create` went to Immanah's `upstream` repo (GitHub refused it). If the setting is ever lost, pass `-R andre3oo0/Bubble`.
- **Server changes need a dev restart:** `npm run dev` (tsx) doesn't reload server files, only the client.
- **Screenshots with the preview pane hidden:** framer-motion fades freeze part-way, so text looks faded. That's the capture, not the page.

## Workflow

- One branch per piece of work, merged to `main` with fast-forward only, then pushed. [CONTRIBUTING.md](../CONTRIBUTING.md) has the checks and rules.
- Commit messages: short, lowercase, imperative, no lists or emoji.
- Changes to Bubble's prompt are checked after deploy with `npm run try-chat`, comparing against the previous run. It counts against the signed-out daily limit for the network it runs from (40 by default), so a few runs in a day use it up.
- **Releases:** versions follow `package.json` (0.x until beta). A release is a git tag (`v0.1.0`) plus a GitHub release with short notes on what changed for users.
- **README screenshots** (`docs/images/`) are taken from the local app with a throwaway in-memory account and made-up journal entries, phone at 390 x 844 and desktop at 1440 x 900, both at 2x. Retake them when a screen in the README changes noticeably.

## Current state

Live at `https://bubble-1-kafq.onrender.com` on the free stack, deployed from `main`. Version 0.1.0 is the first GitHub release (6 October 2026); later work is on `main` but not yet in a release. The live app has: the drawn scenes, the first-visit introduction with optional sign-in (email or Google), the post-chat debrief, journal prompts, search, undo and "Reflect with Bubble", mood check-ins, a calmer help screen, loading, offline and 404 states, the phone layout with four tabs and a menu sheet, the desktop sidebar, a slower breathing pace, the gentler AI notice and replies, the new Bubble faces and logo, and (6 October, after 0.1.0) the security-audit fixes, the redesigned Settings screen, and the privacy policy and terms of use with consent at sign-up and before the first chat. Since then (7 October): the fixes from a UI/UX review (`UX-REVIEW.md`, local only): shared control styles and the end of pill shapes (04), journal draft protection and the duplicate-entry fix, feedback by email, a roomier phone chat, one breathing dialog, opaque dialogs, en-ZA dates, mood check-ins without a pre-selected mood, and the home summary. The repo has a full README with screenshots, SAFETY, DEPLOYMENT, CONTRIBUTING, SECURITY and an MIT licence.

First, the owner's security follow-ups under "Before launch" (new keys, two-factor sign-in, Dependabot).

**Next action item: make Qwen's replies faster and tighter.** The second live run (6 October, see "AI" below) found replies taking 12 to 26 seconds, and a few prompt rules not holding. Suggested order, each checked with a short `try-chat` run on the live site afterwards:
1. Speed: find out whether Qwen on Groq is "thinking" before it answers (the `<think>` text `parseBestEffort` strips), and if so turn it off for this model (Groq's `reasoning_effort` for Qwen; today `OPENAI_REASONING_EFFORT=none` only means "don't send the setting"). If it isn't thinking, compare a few response times in Groq's console before changing anything.
2. Prompt: fewer replies ending in a question, an actual answer when asked "what should I do" (the celebrate reply dodged it), no advice the first time a worry comes up, and the "completely normal / valid" lines.
3. Ask the tester whether Bubble feels warmer (owner).

Smaller open points: the "listening" face exists but isn't used anywhere yet (an idea: while the person is typing in chat); the Android APK still has the old launcher icon until it's rebuilt in PWABuilder with the same signing key.

- **Android:** the APK (PWABuilder, package `com.onrender.bubble_1_kafq.twa`) is in the owner's Downloads with its signing key. The site has served its `assetlinks.json` since 14:22 on 5 October, so after a reinstall the app should open without a browser bar. On the phone it still showed the bar (5 October). Checked and correct: Google's Digital Asset Links API reads the site's statement, the APK's v2/v3 signing certificate matches the fingerprint, and the APK's package and start URL match. What's left is on the phone: uninstall before reinstalling (installing over the old app keeps its failed check), open, close and reopen, Chrome as the default browser and up to date, then a restart. The owner will look at it later.
- **AI:** Groq `qwen/qwen3.8-27b` since 6 October; to undo, set `OPENAI_MODEL=openai/gpt-oss-120b` in Render. First live run: much warmer than gpt-oss, varied endings, no interview questions, about 1 s per reply; a few stock lines remain ("completely understandable", "your anger is valid") and some replies run long, so a later prompt tweak may trim length. Second live run (6 October, exam, friend, good news; in-app browser, one device ID): all real replies with sensible moods and no false risk flags; warm and specific, and it answered "do you ever get nervous" honestly as an AI and "am I overreacting" directly. But replies took 12 to 26 seconds (the first run was about 1 s), most ended with a question, the exam advice reply stopped mid-sentence ("What does your") although it was valid JSON, so the model ended it rather than the token cap, "what should I do to celebrate?" got no actual ideas, it suggested messaging the friend before being asked, and "completely normal" / "completely human response" / "valid worry" still appear. How it got here, all on 6 October: a tester found gpt-oss replies helpful but not compassionate; a warmth rework fixed that but every reply then ended "I'm here if you want to talk…"; banning stock lines didn't stick because gpt-oss ignores "never say X" rules, so the model was switched. Groq's only structured-output models are GPT-OSS (20B, 120B, safeguard 20B) and `qwen/qwen3.8-27b`.
- **Domain:** `bubblementalhealth.com` was started in Render but isn't registered, so it doesn't work. Moving to a domain later means rebuilding the APK.

## Before launch (owner's tasks)

- [x] Free accounts: Groq, Neon, Brevo, Render, UptimeRobot
- [x] Google sign-in credentials (Google Cloud, project "Bubble"), in Render and the local `.env`
- [ ] Try "Continue with Google" on the live site and on the phone
- [ ] Sign up on the live site, confirm the email arrives, try a password reset
- [ ] Check Groq's free limits for `qwen/qwen3.8-27b` (console.groq.com, Settings → Limits) and lower `CHAT_DAILY_LIMIT_*` if needed
- [ ] When funded: OpenAI credit, a monthly budget, separate local and production keys
- [ ] **Security audit follow-ups (owner, soon):** create a new Google OAuth client secret and a new Groq key, put them in Render, and use a separate Google client and Groq key in the local `.env`, so a development machine never holds the live site's secrets (costs nothing); turn on two-factor sign-in for Render, Neon, Groq, Brevo, Google Cloud and GitHub; turn on Dependabot alerts and security updates (GitHub, Settings → Code security); set `AI_DAILY_LIMIT` in Render just under Groq's requests per day for the model
- [ ] On the live site, signed in: the session cookie shows the `__Secure-` prefix, Secure, HttpOnly and SameSite=Lax, and `BETTER_AUTH_URL` in Render is exactly `https://bubble-1-kafq.onrender.com`
- [ ] Render's proxy count: from two different networks, compare the `RateLimit` header from `/api/chat`, then send one with a made-up `X-Forwarded-For` and check the count doesn't reset (uses signed-out messages; keep it to a few)
- [ ] **Before going live (technical debt from the privacy policy, 6 October):**
  - [ ] Replace the owner's personal email in `LEGAL_CONTACT` (`shared/legal.ts`) with a Bubble address. It shows on the privacy policy and terms
  - [ ] Have someone qualified in POPIA review `/privacy` and `/terms`, including the cross-border transfer to Groq (s72, and whether s57 prior authorisation applies), the consumer-law wording and the liability paragraph
  - [ ] The pages name "Bubble" as the responsible party, not people (owner's choice). Ask the reviewer whether POPIA (s18) needs a legal name and address there, and whether that means setting up a company or NPO first
  - [ ] Find out whether Groq keeps API requests, for how long, and whether it trains on them; add the answer to the policy and SAFETY.md
  - [ ] Check the Information Regulator's website and complaints address in `shared/legal.ts` against their site (taken from a search, 6 October; their site wasn't reachable from the work network)
  - [ ] Register an Information Officer, keep the providers' data processing terms on file, and write a one-page breach plan and a retention schedule (including Neon backups and Render logs)
- [ ] Check SADAG and Lifeline numbers in `shared/safety.ts` against their sites
- [ ] Immanah's OK to launch, including the deeper colours
- [ ] On a real phone: breathing circle with calm visuals on
- [ ] Reinstall the APK and confirm it opens without a browser bar
- [ ] Rebuild the APK in PWABuilder (same signing key) so it gets the new launcher icon
- [ ] Try "Reflect with Bubble" on a real entry (needs a signed-in account on the live site)
- [x] Look at Groq's model list for another free model with structured outputs (6 October: only GPT-OSS and `qwen/qwen3.8-27b`)
- [x] Try `qwen/qwen3.8-27b` for chat (switched 6 October, kept)
- [x] Run the rest of `try-chat` against Qwen (6 October; results under "AI"). Still to do: ask the tester whether it feels warmer

## UI/UX redesign plan

From the owner's design handoff, `Bubble UIUX improvements.zip` (5 October 2026, in the project folder but never committed): a 16-point audit and redesigned screens (`Bubble Redesign.dc.html`) plus design tokens. The handoff is styled on Curro's design system; the owner chose to keep its flat approach (hairline-divided lists, small corners on controls, no blur, glow or decorative motion) but in Bubble's own colours and fonts, never Curro's.

**Done:** the control shapes (04, 7 October: 8 px everywhere, see "One set of control styles"), chat errors as notices with Retry (08), the growing message box with typing dots and time labels (09), the "Bubble is an AI" line on the home screen and in chat (14), journal delete with a confirmation and 6-second undo (10), an optional journal title plus search (11), loading placeholders, an offline banner and a proper 404 (16), the phone layout (06: four tabs, a simpler header, no floating button), a calmer help screen (13), the desktop sidebar with content capped at 720 px (05), and the new Bubble faces and logo, still, in Bubble's colours (03; from a second download of the same name in the owner's Downloads, with SVG assets only).

**Settings (07, 04), done 6 October** from the written plan (the original design file was no longer on disk): one screen with Account (who's signed in, confirm email, change password, sign out; sign-in buttons when signed out), Privacy (what's kept, download my data, delete my account), Safety (the AI notice, Get help, the introduction) and Display (scene, sound, calm visuals as a switch, theme as a segmented control). Flat sections with hairline rows and 8 px corners; only the switch is rounded. Setting Bubble's mood by hand is gone, and the Mood tab's reminder times are hidden until reminders exist. Change password and Delete open the account dialog straight at that step (`open('login', { action })` in `accountStore`).

**Owner's decisions (5 October 2026):**
- **Rising mood bubbles stay** (6 October): the bubbles that rise in chat when the mood changes are kept, despite the audit suggesting removal (03). They already stop with calm visuals
- **Styling:** the same flat style, but in Bubble's own colours, not Curro's palette or fonts
- **Scenes:** keep the drawn, animated scenes
- **Past chats:** yes. Optional chat history, off by default, kept 30 days. Needs a privacy-notice update (POPIA, health data), a database table, deletion after 30 days and isolation tests
- **Helplines:** South Africa only for now. Another country is added only once a person has checked its numbers
- **Mood:** yes to a five-step scale with optional feeling tags and a 14-day view. Existing check-ins get mapped onto the scale

## Outstanding work

**Next (Phase 1 gaps from the design doc, cheap because the pieces exist):**
1. Dynamic Ambiance Engine: mood drives the background colours and motion
2. Sensory Calibration onboarding (sound or silence, motion, theme) feeding the existing settings
3. Add anger and overwhelm as moods (fits the planned feeling tags)
4. Mirror Moment: grounding overlay on the model's "concern" risk level
5. Streaming replies
6. A rain sound
7. Affirmations tab: the component exists (`AffirmationsTab.tsx`) but isn't linked and needs a real backend
8. Mood trend chart (covered by the 14-day view in the planned five-step mood scale)

**From testing the APK (owner, 5 October):**
- Sign-up was hard to find: now offered on the first page of the introduction, at the top of the phone menu, at the bottom of the desktop sidebar, and as "Create a free account" on the home screen. Testers found sign-in easy (6 October)
- The APK showed a browser bar because the site didn't serve its verification file. The current APK's package name and fingerprint are now built into `server/app.ts`, so it opens full screen. The owner wants it to feel like a real app later, not the website in a wrapper

**Known loose ends:**
- Mood check-in reminders: the times screen is hidden until notifications exist (old saved times stay in `checkInTimes` on the device and are cleared on sign-out)
- A journal draft is lost if you switch tabs mid-entry (the editor's state lives in the Journal screen); Cancel and back do ask first
- `AffirmationsTab.tsx` is unused and still in the old rounded style
- Journal encryption at rest (field level) not done; the PDD's end-to-end encryption isn't compatible with server-side AI as designed

**Later phases (not started):** community, wearables, sleep system, AR, Orrery, Chronicle, smart home, Teams, therapist portal, monetisation, analytics and safety metrics.
