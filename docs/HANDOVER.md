# Bubble handover

Status as of 6 October 2026. Read this before changing anything. The README is the public overview; [SAFETY.md](SAFETY.md) and [DEPLOYMENT.md](DEPLOYMENT.md) cover crisis handling, privacy and hosting in detail.

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
| Frontend | React 18, Vite, TypeScript, Tailwind, Radix dialog, Zustand, TanStack Query, framer-motion, wouter |
| Backend | Node (20+, developed on 24), Express 4, one process serving API and frontend |
| Database | Postgres via Drizzle ORM. Locally and in tests: PGlite (embedded Postgres, nothing to install) |
| Auth | Better Auth: email and password, plus Google when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set. Sessions in Postgres |
| AI | OpenAI SDK. Live: Groq free tier, `openai/gpt-oss-120b`, via `OPENAI_BASE_URL`. Unset that and the model for OpenAI (`gpt-4.1-mini` default) |
| Email | Brevo HTTP API (free, verified sender, no domain) or Resend; console output when neither is configured |
| Tests | Vitest (116 tests), in-memory database, AI and email mocked |
| Deploy | Render free web service (Docker, Frankfurt), Neon free Postgres (Frankfurt), UptimeRobot pings `/api/health` so it doesn't sleep. GitHub Actions CI (check, test, build) |

## Layout

```
client/src/
  pages/        Home (whole app shell, phone + desktop layouts), ResetPassword, not-found
  components/   ChatPanel, ChatDebrief (end-of-chat choices), JournalPanel, EntryReflection
                ("Reflect with Bubble"), MoodPanel, AvatarPanel (= Settings tab), SosScreen,
                BreathingExercise, AuthenticationModal (account dialog), BubbleAvatar (Bubble's face), BubbleLogo,
                SceneBackdrop (the drawn scenes), scenes.ts (scene names), IntroTour (first-visit walkthrough),
                OfflineBanner, Skeleton (loading placeholders), PhoneMenu (account, Settings, Feedback on phones),
                GoogleButton
  store/        Zustand: mood (shared app mood), sos, sound, preferences, account dialog, chat,
                intro (seen once), journalDelete (6-second undo)
  lib/          api.ts, chatService.ts, online.ts (browser's online flag), googleSignIn.ts, authClient.ts, audioHandler.ts (generated ambient sound),
                breathing.ts, motion.ts, moods.ts (labels and muted colours), journalPrompts.ts
client/public/  manifest, icons, sw.js (service worker) and offline.html (helplines with no connection)
server/
  index.ts      startup: migrations, app, Vite (dev) or static files (prod), graceful shutdown
  app.ts        Express app: proxy trust, helmet, auth handler, logging, routes, JSON 404
  routes.ts     /api/chat (+ fallback replies, usage cap), scenes, affirmation
  dataRoutes.ts journal, moods, data export (all need a session)
  auth.ts       Better Auth config, requireUser middleware
  openaiService.ts  the AI calls: chat reply {reply, user_mood, risk}, chat reflection, entry reflection;
                strict structured outputs for GPT models, best-effort plus parseBestEffort() for others
  usage.ts      daily chat counter, email.ts transactional email, db.ts database
shared/
  schema.ts     Drizzle tables (server only), api.ts / chat.ts request + response types,
  safety.ts     crisis keyword check, helplines, crisis reply (used by client AND server)
migrations/     generated SQL, applied automatically on startup
scripts/        try-chat.mjs: scripted conversations against a server, to judge how Bubble talks
docs/           HANDOVER (this), SAFETY (crisis handling, privacy), DEPLOYMENT (free stack, Android),
                images/ (README banner and screenshots)
README.md, CONTRIBUTING.md, SECURITY.md   public overview, contributor rules, vulnerability reports
```

## Running it

```bash
npm install
npm run dev        # http://localhost:5000, needs OPENAI_API_KEY in .env
npm test
npm run check      # type-check
npm run build && npm start
npm run try-chat   # four test conversations against the live site; prints Bubble's replies
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
| `GET /api/auth-options` | `{google}`: whether to show "Continue with Google" |

## Decisions worth knowing (and why)

- **Crisis safety never depends on the AI.** A keyword check (`shared/safety.ts`) runs on the server and, if the network fails, in the browser. A crisis message always gets the helplines, even when the AI is down or the user is over the daily limit. The SOS screen opens automatically on the first crisis message of a visit.
- **Bubble talks like a caring friend, not an interviewer** (system prompt in `openaiService.ts`). Compassion comes first when someone is hurting: it says it's sorry, that the feeling makes sense and that they're not alone, before anything else, and it's never clever or jokey about pain. It answers direct questions honestly, doesn't parrot ("It sounds like…"), asks few questions (in heavy moments it reassures instead), and offers breathing or journaling only when it fits. Three worked examples set the tone. Tester feedback (6 October) was that earlier, wittier versions felt short on compassion for a "safe space".
- **The canned replies** (AI down) can't know what was said, so they're gentle and open and never assume; loss words ("passed away", "funeral") always count as sad. Signed-in people's display name is passed in so Bubble can use it occasionally. Reasoning models (gpt-oss) run with `reasoning_effort: medium`; on low they followed the style rules noticeably worse.
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
- **Daily AI cap** (150 per user, 40 per guest, 20 per minute; all configurable). Guests are counted by a keyed hash of their IP, never the raw IP. A limit of 0 is valid.
- **Ambient sound is generated with the Web Audio API**, not audio files: no hosting, licensing or data cost. It only plays when the user presses play.
- **Calm visuals** (reduced motion) follows the device setting or an in-app switch. The breathing circle keeps moving because it is the exercise.
- **Colours were deepened for contrast** (WCAG AA). `client/src/lib/contrast.test.ts` fails if a low-contrast pair comes back, including the scene skies.
- **Scenes are drawn as one inline SVG each** (`SceneBackdrop.tsx`): no image files to host. The drawing is cropped to fill and anchored to the bottom, so phones only see the middle; keep the interesting part near the centre. Night swaps the sun for a moon and stars and dims the drawing, instead of covering it in navy.
- **No "vibe-coded" UI**: no purple, neon accents, decorative glows or arbitrary shadows, cards inside cards, emoji icons or meaningless status dots. Moods are words with muted colours (`client/src/lib/moods.ts`, contrast-tested). Only dialogs have shadows; nothing floats over the page.
- **Panels use neutral frosted glass** (`surface`, `surface-soft`, `surface-bar` in `index.css`) so they read on every scene. Don't bring back blue-tinted panels; they only suited the ocean.
- **Zero-cost hosting until funded**: Groq, Neon, Brevo, Render and UptimeRobot free plans, no card on file. Groq was picked over Gemini's free tier because Google may use free-tier prompts to improve its products, which is wrong for health conversations. Going back to OpenAI is a settings change.
- **The introduction shows once per device** (remembered in local storage, `introStore.ts`) and can be replayed from the home screen, Settings or the phone menu. It has its own help button because it covers the header.
- **Phones get four tabs** (Home, Chat, Journal, Mood). Settings, Feedback and the account sit behind the menu button in the header (`PhoneMenu`: a dark sheet that slides up, with the account at the top, a scene picker that changes the scene live behind it, a sound button, then the links), which is just the name, "Get help" and that menu. Nothing floats over the content: breathing is on Home, in Chat and on the help screen.
- **Desktop has one 240 px labelled sidebar** (Home, Chat, Journal, Mood, Settings, Feedback), a permanent "Get help now" under the links, and the account (name and email, or "Sign in") at the bottom. Content is centred and capped at 720 px. Bubble's face is on the Home screen on both phone and desktop, and stays still.
- **The help screen is flat and calm**: full screen on phones, the danger line (112) on its own with a red outline, then the helplines as plain rows. The buttons that open it say "Get help" in a quiet outline (`helpButtonClass` in `SosScreen.tsx`); red is only for the danger line.
- **Installable, with an offline helplines page.** `client/public` has the manifest, icons (drawn from the logo) and `sw.js`. The worker caches only `offline.html`; the app and API always come from the network, so deploys show up straight away. `offline.html` repeats the helplines as plain HTML; `offline.test.ts` fails if it drifts from `shared/safety.ts`.
- **Android app = the live site in a Trusted Web Activity**, packaged with PWABuilder (free). It updates with every deploy, no new APK needed. `/.well-known/assetlinks.json` proves the APK and the site belong together; without it the app shows a browser bar. It serves the current APK's details (built into `server/app.ts`), overridable with `ANDROID_PACKAGE_NAME` and `ANDROID_CERT_SHA256`. The APK is tied to the address it was built for: moving to a custom domain means rebuilding it. Keep the signing key from PWABuilder's zip safe, since updates to an installed app must be signed with the same key.
- **Offline, in the app too.** While the device is offline a banner on every screen says Bubble can't reply and gives SADAG's number plus an "All helplines" link to the SOS screen. Chat still lets you send: the message fails with Retry, and a crisis message still gets the helplines from the browser. The browser's online flag can say "online" on a network with no internet, so the banner is an early warning, not the only check.
- **Loading shows placeholder rows** shaped like the content (journal and mood history). Their pulse uses an `animated-` class, so calm visuals stops it.
- **The 404 page** has a way back and lists the helplines, so help is reachable even from a wrong link.
- **Bubble's face and logo** (6 October) come from the owner's design: a flat bubble with a face for each mood, plus "listening" and "thinking" (shown beside the typing dots). They're drawn in code (`BubbleAvatar.tsx`, `BubbleLogo.tsx`, colours in `BUBBLE_COLOURS`), not image files. The design arrived in Curro's colours, so it was recoloured to Bubble's: fill `#C9ECFF`, ring `#8CCBEB`, accent `#5BAEDC`, lines `#0B3D66`. The faces are still; only the rising mood bubbles in chat move. Exported design files can carry provenance metadata (a `<metadata>` block): strip it before anything goes in the repo. The favicon and app icons in `client/public` were regenerated from the new mark; the Android APK keeps its old launcher icon until it's rebuilt in PWABuilder with the same signing key.
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
- **The owner's work network (Curro) blocks `api.groq.com`.** On that network local chat always uses the fallback replies. Judge how Bubble talks with `npm run try-chat` against the live site after a deploy.
- **Server changes need a dev restart:** `npm run dev` (tsx) doesn't reload server files, only the client.
- **Screenshots with the preview pane hidden:** framer-motion fades freeze part-way, so text looks faded. That's the capture, not the page.

## Workflow

- One branch per piece of work, merged to `main` with fast-forward only, then pushed. [CONTRIBUTING.md](../CONTRIBUTING.md) has the checks and rules.
- Commit messages: short, lowercase, imperative, no lists or emoji.
- Changes to Bubble's prompt are checked after deploy with `npm run try-chat`, comparing against the previous run. It counts against the signed-out daily limit for the network it runs from (40 by default), so a few runs in a day use it up.
- **Releases:** versions follow `package.json` (0.x until beta). A release is a git tag (`v0.1.0`) plus a GitHub release with short notes on what changed for users.
- **README screenshots** (`docs/images/`) are taken from the local app with a throwaway in-memory account and made-up journal entries, phone at 390 x 844 and desktop at 1440 x 900, both at 2x. Retake them when a screen in the README changes noticeably.

## Current state

Live at `https://bubble-1-kafq.onrender.com` on the free stack, deployed from `main`. Version 0.1.0, the first GitHub release (6 October 2026). The live app has: the drawn scenes, the first-visit introduction with optional sign-in (email or Google), the post-chat debrief, journal prompts, search, undo and "Reflect with Bubble", mood check-ins, a calmer help screen, loading, offline and 404 states, the phone layout with four tabs and a menu sheet, the desktop sidebar, a slower breathing pace, and the gentler AI notice and replies.

- **Android:** the APK (PWABuilder, package `com.onrender.bubble_1_kafq.twa`) is in the owner's Downloads with its signing key. The site has served its `assetlinks.json` since 14:22 on 5 October, so after a reinstall the app should open without a browser bar. On the phone it still showed the bar (5 October). Checked and correct: Google's Digital Asset Links API reads the site's statement, the APK's v2/v3 signing certificate matches the fingerprint, and the APK's package and start URL match. What's left is on the phone: uninstall before reinstalling (installing over the old app keeps its failed check), open, close and reopen, Chrome as the default browser and up to date, then a restart. The owner will look at it later.
- **AI:** Groq `qwen/qwen3.8-27b` since 6 October (was `openai/gpt-oss-120b`; switch back in Render's `OPENAI_MODEL` if needed). First live run: much warmer, varied endings, no interview questions, about 1 s per reply instead of several; a few stock lines remain ("completely understandable", "your anger is valid") and some replies run long. The exam, friend and good-news conversations weren't run yet (the guest daily limit was reached from the work network). History with gpt-oss-120b, reasoning `medium`: A tester found replies quick and helpful but not compassionate enough; the prompt was reworked for warmth on 6 October. The run before it (live, 6 October): nearly every reply ended in a question, it was clever about pain ("a classic test moment"), and the AI once failed on "my gran passed away", which got a cold canned reply. `try-chat` now includes a grief conversation. The warmth rework fixed that (sympathy first, no interview questions) but overcorrected: every reply ended "I'm here if you want to talk…", stock lines crept in ("it's understandable", "sit with that feeling") and it stopped engaging with details. The next round bans those lines, limits "I'm here" to once every few replies, and asks for comfort that's specific, then real conversation. That round (live, 6 October) engaged more but still used banned phrases and ended most replies with a question: this model ignores "never say X" rules. Groq's only other structured-output model worth trying is `qwen/qwen3.8-27b`, which has best-effort mode only, so the server now checks those replies itself (`parseBestEffort`; GPT models keep strict mode). Trying it is a settings change: `OPENAI_MODEL=qwen/qwen3.8-27b` in Render, then `try-chat`; set it back to `openai/gpt-oss-120b` to undo.
- **Domain:** `bubblementalhealth.com` was started in Render but isn't registered, so it doesn't work. Moving to a domain later means rebuilding the APK.

## Before launch (owner's tasks)

- [x] Free accounts: Groq, Neon, Brevo, Render, UptimeRobot
- [x] Google sign-in credentials (Google Cloud, project "Bubble"), in Render and the local `.env`
- [ ] Try "Continue with Google" on the live site and on the phone
- [ ] Sign up on the live site, confirm the email arrives, try a password reset
- [ ] Check Groq's free limits for `openai/gpt-oss-120b` (console.groq.com, Settings → Limits) and lower `CHAT_DAILY_LIMIT_*` if needed
- [ ] When funded: OpenAI credit, a monthly budget, separate local and production keys
- [ ] Check SADAG and Lifeline numbers in `shared/safety.ts` against their sites
- [ ] Immanah's OK to launch, including the deeper colours
- [ ] Privacy notice (POPIA: health-related data, stored in Frankfurt, chat sent to Groq). Needed before optional past chats ships
- [ ] On a real phone: breathing circle with calm visuals on
- [ ] Reinstall the APK and confirm it opens without a browser bar
- [ ] Try "Reflect with Bubble" on a real entry (needs a signed-in account on the live site)
- [x] Look at Groq's model list for another free model with structured outputs (6 October: only GPT-OSS and `qwen/qwen3.8-27b`)
- [x] Try `qwen/qwen3.8-27b` for chat (switched 6 October, kept)
- [ ] Run the rest of `try-chat` against Qwen, and ask the tester whether it feels warmer

## UI/UX redesign plan

From the owner's design handoff, `Bubble UIUX improvements.zip` (5 October 2026, kept outside the repo): a 16-point audit and redesigned screens (`Bubble Redesign.dc.html`) plus design tokens. The handoff is styled on Curro's design system; the owner chose to keep its flat approach (hairline-divided lists, small corners on controls, no blur, glow or decorative motion) but in Bubble's own colours and fonts, never Curro's.

**Done:** chat errors as notices with Retry (08), the growing message box with typing dots and time labels (09), the "Bubble is an AI" line on the home screen and in chat (14), journal delete with a confirmation and 6-second undo (10), an optional journal title plus search (11), loading placeholders, an offline banner and a proper 404 (16), the phone layout (06: four tabs, a simpler header, no floating button), a calmer help screen (13), the desktop sidebar with content capped at 720 px (05), and Bubble's face kept still (part of 03). The new screens use 8 px corners; the project's `rounded-lg` is still 24 px until the controls are reworked (04).

**Ready to build (no open questions):**
- Settings: drop setting Bubble's mood by hand, hide reminder times until reminders exist, and bring account, privacy, safety and display into one screen (07); controls lose the pill shape except switches (04)

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
- Sign-up was hard to find: now a labelled "Sign in" button in the header and sidebar, plus "Create a free account" on the home screen. Worth asking testers whether it's clear enough now
- The APK showed a browser bar because the site didn't serve its verification file. The current APK's package name and fingerprint are now built into `server/app.ts`, so it opens full screen. The owner wants it to feel like a real app later, not the website in a wrapper

**Known loose ends:**
- `index.css` still has the old scenery styles (cafe, rain, stars, lamp, the CSS trees and clouds). Nothing uses them; they can be deleted
- Feedback form only logs to the browser console
- Mood check-in reminder times are saved but nothing is sent (needs notifications)
- `ChatInterface` renders a second `BreathingExercise` alongside the one in Home
- `POST /api/environment/change` is unused
- Journal encryption at rest (field level) not done; the PDD's end-to-end encryption isn't compatible with server-side AI as designed

**Later phases (not started):** community, wearables, sleep system, AR, Orrery, Chronicle, smart home, Teams, therapist portal, monetisation, analytics and safety metrics.
