# Deployment

Bubble runs as one Docker container that serves both the API and the frontend. Any host that runs containers works. This guide covers the setup the live site uses, which costs nothing: Render, Neon, Groq, Brevo, Google and UptimeRobot, all on free plans with no card on file.

Live site: https://bubble-1-kafq.onrender.com, deployed from `main`.

## 1. Database: Neon

1. Create a free project at [neon.tech](https://neon.tech) in the **Frankfurt** region (close to the Render service).
2. Copy the connection string. It becomes `DATABASE_URL`.

Migrations run automatically when the server starts. There's nothing to run by hand.

## 2. AI: Groq

1. Create a free account at [console.groq.com](https://console.groq.com) and an API key.
2. Settings:
   - `OPENAI_API_KEY`: the Groq key
   - `OPENAI_BASE_URL`: `https://api.groq.com/openai/v1`
   - `OPENAI_MODEL`: `qwen/qwen3.8-27b` (the live model) or `openai/gpt-oss-120b`

The model must support Groq's structured outputs. GPT models use strict mode; others use best-effort mode, and the server checks every reply itself. Check the model's free limits under **Settings → Limits** and keep `CHAT_DAILY_LIMIT_USER` and `CHAT_DAILY_LIMIT_GUEST` inside them.

To use OpenAI instead, set only `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, which defaults to `gpt-4.1-mini`).

## 3. Email: Brevo

1. Create a free account at [brevo.com](https://www.brevo.com), verify a single sender address (no domain needed), and create an API key.
2. Settings: `BREVO_API_KEY`, and `EMAIL_FROM` as `Bubble <your-verified-address>`.

Brevo sends the email confirmation and password reset emails. `RESEND_API_KEY` works instead, but Resend needs a verified domain. Without either, emails are printed to the server log, which is only useful locally.

## 4. Google sign-in (optional)

1. At [console.cloud.google.com](https://console.cloud.google.com), create a project, open **Google Auth Platform**, and set up the consent screen: app name, support email, **External** audience. Skip the logo (uploading one triggers a review that can take days).
2. Under **Audience**, publish the app, otherwise only listed test users can sign in.
3. Under **Clients**, create a **Web application** client with these redirect URIs:
   - `https://<your-site>/api/auth/callback/google`
   - `http://localhost:5000/api/auth/callback/google`
4. Settings: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

The "Continue with Google" button only appears when both are set.

## 5. Hosting: Render

1. Create a **Web Service** from this repository, **Docker** runtime, **Frankfurt** region, free instance.
2. Add the environment variables:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | From Neon. Required in production |
| `BETTER_AUTH_SECRET` | Long and random, different from your local one. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_URL` | The public address, e.g. `https://bubble-1-kafq.onrender.com`, no trailing slash |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | From step 2. Use a separate key from your local one, so either can be revoked |
| `BREVO_API_KEY`, `EMAIL_FROM` | From step 3 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From step 4, optional |

3. Set the health check path to `/api/health`.

Every push to `main` deploys. Startup waits for the database (four tries, 15 seconds each) and logs `[startup]` lines showing how far it got.

Optional settings (chat limits, reasoning effort, proxy trust, Android) are described in [`.env.example`](../.env.example).

## 6. Keeping it awake: UptimeRobot

Render's free instances sleep after 15 minutes without traffic, which makes the first visit slow. A free [UptimeRobot](https://uptimerobot.com) HTTP monitor on `https://<your-site>/api/health` every 5 minutes keeps it awake.

## 7. Android app

The Android app is the live site in a Trusted Web Activity, packaged for free with [PWABuilder](https://www.pwabuilder.com). It updates with every deploy; no new APK is needed.

- `/.well-known/assetlinks.json` proves the APK and the site belong together. Without it, the app shows a browser bar. The current APK's package name and certificate fingerprint are built into `server/app.ts`.
- For a new signing key or a new domain, set `ANDROID_PACKAGE_NAME` and `ANDROID_CERT_SHA256` from the `assetlinks.json` in PWABuilder's download.
- The APK is tied to the address it was built for, so moving to a custom domain means rebuilding it. Keep the signing key from PWABuilder's zip safe: updates to an installed app must be signed with the same key.

## After a deploy

- `https://<your-site>/api/health` returns `{"status":"ok"}`.
- After changing the prompt or the model, run `npm run try-chat` against the live site and compare with the last run.
- On a phone: the help screen opens, the helplines dial, and the app opens full screen.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) type-checks, tests and builds every push to `main` and every pull request. It needs no secrets: tests use an in-memory database and never call real services.
