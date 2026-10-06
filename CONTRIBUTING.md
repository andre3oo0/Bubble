# Contributing

Thanks for helping with Bubble. Read [docs/HANDOVER.md](docs/HANDOVER.md) first: it explains how the app fits together, the decisions behind it and the gotchas. Then [docs/SAFETY.md](docs/SAFETY.md), because some rules here exist to keep vulnerable people safe.

## Getting set up

```bash
npm install
cp .env.example .env
npm run dev
```

No database server or AI key is needed to run it locally. See the [README](README.md#quick-start).

## Workflow

- One branch per piece of work: `feat/...`, `fix/...`, `docs/...` or `chore/...`.
- Before asking for a review, all three must pass:

  ```bash
  npm run check   # type-check, must be clean
  npm test        # every test passing
  npm run build   # must succeed
  ```

- For UI changes, look at the app at phone width (375 px) and on desktop.
- Changes merge into `main` with a fast-forward, and `main` deploys to the live site.

## Commit messages

Short, lowercase, imperative, no trailing full stop, under about 60 characters:

```
fix mood detection in chat
add crisis helplines to chat replies
```

Usually no body. If one helps, one to three plain sentences on why. No emoji, headings or lists of changed files. Pull request descriptions are a few lines on what changed and what a reviewer should check.

## Rules every change follows

**Safety**

- Crisis handling (`shared/safety.ts`) must keep working with the AI down, offline, over the daily limit or rate-limited. Any change to chat must keep the crisis tests in `server/routes.test.ts` passing.
- Helpline wording stays accurate and matches `shared/safety.ts`. Lifeline's 0861 number isn't free.
- Bubble says it's an AI and isn't a substitute for a therapist, on the home screen and in chat.

**Privacy**

- Never log chat or journal content. Log the kind of an error (`describeError` in `server/log.ts`), never the error itself: a failed query or a broken request carries what someone wrote. Never store IP addresses, raw or in sessions.
- The privacy policy and terms (`client/src/pages/Legal.tsx`) must match what the code does. Update them with SAFETY.md, and bump `LEGAL_VERSION` in `shared/legal.ts` when people should agree again.
- Every journal and mood query is scoped to the signed-in user. Any new endpoint that touches user data gets an isolation test showing one person can't see another's data.

**Design**

Bubble's interface is flat and calm. Please don't add:

- purple, violet or indigo gradients or glows, neon or high-chroma colours (one accent, the app blue, for actions; red only for help and danger)
- decorative glows, blurs or shadows (a shadow only on something that really floats, like a dialog)
- cards inside cards, emojis as icons, or status dots that don't carry real information

Always design the loading, empty, error and offline states, not just the happy path.

**Cost**

Bubble runs on free tiers until it's funded. Don't add a paid service, and say clearly in the pull request if a change would cost money.

**Secrets**

Keys and passwords go in `.env` (local, ignored by git) or the host's settings, never in the repository.

## Tests

Tests use Vitest with an in-memory database, and mock the AI and email, so they never call real services. Add tests next to the code they cover (`*.test.ts`). To judge how Bubble talks after changing the prompt or model, deploy and run `npm run try-chat` against the live site.
