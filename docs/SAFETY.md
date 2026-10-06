# Safety and privacy

Bubble is used by people who may be struggling. This page explains how it keeps them safe and what it does with what they share. If you change anything described here, update this page in the same change.

> Bubble is an AI and isn't a substitute for a therapist. In South Africa: SADAG Suicide Crisis Line **0800 567 567** (24 hours, free), Lifeline **0861 322 322** (24 hours), emergencies **112**.

## Crisis handling

**The rule: a message that needs helplines always gets them, whatever else is going wrong.**

- **A keyword check, not the AI, decides.** `shared/safety.ts` looks for signs of suicidal thoughts, self-harm and danger. It's deliberately broad: a false alarm only shows helpline numbers, while a miss is far worse. The same code runs on the server and in the browser.
- **The server's check wins.** The AI also rates each message (`none`, `concern` or `crisis`), but if the keyword check says crisis, it's a crisis, whatever the model said.
- **It works when things fail:**
  - The AI is down or slow: the reply is the fixed crisis message plus the helplines.
  - The daily chat limit is reached: crisis messages are still answered, with the helplines.
  - The phone is offline: the browser runs the same check and shows the crisis reply and helplines without the server.
  - No connection at all: the installed app's service worker shows `offline.html`, a plain page of helplines with tap-to-call links.
- **The help screen opens by itself** on the first crisis message of a visit, and the **Get help** button is on every screen (in the header on phones, in the sidebar on desktop, and on the first-visit introduction).
- **Reflections check too.** The end-of-chat reflection and "Reflect with Bubble" on a journal entry add the helplines if the person's own words contain crisis signs.
- **The AI is told never to give information about methods**, to take risk seriously, and to encourage reaching out to a crisis line or someone they trust.

Helpline details live in one place, `HELPLINES` in `shared/safety.ts`. The offline page repeats them as plain HTML, and `client/src/lib/offline.test.ts` fails if the two drift apart. Lifeline's 0861 number is not free; keep that wording accurate. Only South African lines are listed. Another country is added only once a person has checked its numbers.

Tests that must keep passing for any change to chat: the crisis tests in `server/routes.test.ts`.

## How Bubble talks

The system prompt in `server/openaiService.ts` asks for a caring friend, not a therapist or an interviewer. Bubble comforts first when someone is hurting, gives no advice the first time a worry comes up, asks few questions, isn't clever about pain, and never diagnoses or gives medical advice. It says it's an AI if asked, and the app says so on the home screen and at the top of every chat.

Changes to the prompt or model are judged on the live site with `npm run try-chat`, which runs the same scripted conversations (including a grief conversation) so the results can be compared run to run.

## What's stored, and what isn't

| Data | Stored? | Details |
|---|---|---|
| Chat messages | No | The server keeps the last 24 messages (about 8,000 characters) of a conversation in memory so Bubble can follow along, and forgets them after an hour idle or a restart. "Let go" forgets them straight away. |
| End-of-chat reflection | Only if saved | The transcript is sent for the reflection and not kept. The reflection is saved only if the person chooses "Save to journal". |
| Journal entries | Yes, if signed in | Readable only by their author. Every query is scoped to the signed-in user, with isolation tests. |
| Mood check-ins | Yes, if signed in | Same scoping as the journal. |
| Account | Yes, if created | Name, email and a hashed password (or a Google link). Google's tokens are stored encrypted. |
| Usage counts | Yes | A daily message count per account, or for guests per keyed hash of the IP address. Raw IP addresses are never stored. |
| Logs | Yes | Errors and request lines only. Logs never contain chat or journal content. |
| Preferences | On the device | Scene, sound volume, calm visuals, theme and whether the introduction was seen, in the browser's local storage. |

People can download everything stored about them (Settings, then the account screen, then **Download my data**) and delete their account, which removes the journal, moods and sessions with it.

## Where data goes

- **Hosting and database:** Render and Neon, both in Frankfurt.
- **AI:** chat messages, reflections and journal entries the person asks Bubble to reflect on are sent to Groq to generate a reply. Groq was chosen over Gemini's free tier because Google may use free-tier prompts to improve its products, which is wrong for health conversations.
- **Email:** Brevo sends account emails (confirmation, password reset). No chat or journal content is ever emailed.
- **Sign-in:** Google, only for people who choose "Continue with Google". Bubble asks for name and email only.

## Still to do

- A privacy notice for POPIA (health-related data, stored in Frankfurt, chat sent to Groq), needed before launch and before optional chat history ships.
- Field-level encryption of journal entries at rest.
- Checking the SADAG and Lifeline numbers against their own websites before launch.
