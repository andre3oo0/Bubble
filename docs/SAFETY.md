# Safety and privacy

Bubble is used by people who may be struggling. This page explains how it keeps them safe and what it does with what they share. If you change anything described here, update this page in the same change.

> Bubble is an AI and isn't a substitute for a therapist. In South Africa: SADAG Suicide Crisis Line **0800 567 567** (24 hours, free), Lifeline **0861 322 322** (24 hours), emergencies **112**.

## Crisis handling

**The rule: a message that needs helplines always gets them, whatever else is going wrong.**

- **A keyword check, not the AI, decides.** `shared/safety.ts` looks for signs of suicidal thoughts, self-harm and danger, including slang and softer phrasings ("kms", "unalive", "don't want to wake up", "won't be here tomorrow") and indirect warning signs ("giving my things away", "goodbye letters", "want everything to stop for good", "nobody would notice if I was gone"). It's deliberately broad: a false alarm only shows helpline numbers, while a miss is far worse. The same code runs on the server and in the browser.
- **The server's check wins.** The AI also rates each message (`none`, `concern` or `crisis`), but if the keyword check says crisis, it's a crisis, whatever the model said. A `crisis` rating from the AI also brings the helplines and the help screen, so it can catch phrasings the keywords miss. The AI is told that grief, anger, conflict, loneliness or feeling low aren't a crisis on their own (a false alarm opens the help screen on someone who's sad, not in danger), and to choose crisis whenever the signs are there, even indirectly.
- **It works when things fail:**
  - The AI is down or slow: the reply is the fixed crisis message plus the helplines.
  - The AI answers with no words (an empty reply or a row of dots): it gets a canned reply instead, and if the AI rated the message a crisis, that rating is kept, so the reply is the fixed crisis message plus the helplines.
  - The AI repeats its previous reply word for word: it's asked once more, and if it repeats again or that call fails, the person gets a canned reply. A crisis rating from either call is kept.
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
| Unsaved journal writing | No | Kept only in the open page's memory, so switching tabs doesn't lose it. Never written to the device or sent anywhere until saved. Gone when the page closes, on sign-out, or when someone else (or nobody) is signed in. |
| Mood check-ins | Yes, if signed in | A level from 1 (really low) to 5 (really good), up to five optional feelings, and the time. Same scoping as the journal. Check-ins from before the scale keep their original mood word alongside. |
| Account | Yes, if created | Name (up to 50 characters), email and a hashed password (or a Google link). Google's tokens are stored encrypted. Which version of the terms and privacy policy was agreed to, and when. |
| Sign-in sessions | Yes, if signed in | When each session started and when it expires. Not the IP address or browser. Expired sessions and used email links are deleted every hour. |
| Usage counts | Yes, 7 days | Daily counters for the limits: AI messages per account, or for guests per keyed hash of a random ID their browser makes (kept in local storage, never tied to an account, cleared on sign-out) plus a shared count per keyed hash of their network address; emails sent per keyed hash of the address; failed sign-ins per keyed hash of the email. Raw IP and email addresses are never stored in them. |
| Logs | Yes | Request lines (method, path, status, timing) and the kind of error, never its details: a failed database query or a broken request can contain what someone wrote. Logs never contain chat or journal content, names, emails or IP addresses. |
| Preferences | On the device | Scene, sound volume, calm visuals, theme and whether the introduction was seen, in the browser's local storage. |

People can download everything stored about them (Settings, under Privacy, **Download my data**): account, journal, moods, sign-in methods and sessions. They can delete their account, which removes the journal, moods and sessions with it. Signing out, or deleting the account, also clears the chat and the current mood from the device, so the next person on a shared phone doesn't see them.

## Where data goes

- **Hosting and database:** Render and Neon, both in Frankfurt.
- **AI:** chat messages, reflections and journal entries the person asks Bubble to reflect on are sent to Groq to generate a reply. Groq was chosen over Gemini's free tier because Google may use free-tier prompts to improve its products, which is wrong for health conversations.
- **Email:** Brevo sends account emails (confirmation, password reset). No chat or journal content is ever emailed.
- **Feedback:** the Feedback screen opens the person's own email app with their message filled in, addressed to the contact email. Bubble's server never receives or stores it; the email arrives like any other, with their address.
- **Sign-in:** Google, only for people who choose "Continue with Google". Bubble asks for name and email only.
- **Password checks:** when someone chooses a password on the live site, the first 5 characters of its SHA-1 hash go to [Have I Been Pwned](https://haveibeenpwned.com/Passwords) to check it hasn't appeared in a data breach. The password itself never leaves the server, and the service can't work it out from those 5 characters. If the service is down, the password is accepted.
- **Nothing else:** no analytics, no ads, and no third-party fonts or scripts in the app.

## Consent and age

The [privacy policy](https://bubble-1-kafq.onrender.com/privacy) and [terms of use](https://bubble-1-kafq.onrender.com/terms) are pages in the app, kept in step with this one. Bubble is for people 18 and over.

- Email sign-up needs a tick box ("I'm 18 or older and I agree to the terms of use and privacy policy, including my messages being sent to Bubble's AI provider in the US"). The server refuses sign-up without it and records which version was agreed to, and when.
- Google sign-ups, accounts from before the policy, and everyone after a change are asked to agree on their next visit, or can sign out. The consent record is part of the data export.
- Signed-out chat shows a short note before the first message: who Bubble is for, and that sending a message means agreeing. It's a note, not a button, so nobody in crisis has to tap through anything to be heard. The device remembers it was shown.

## Protecting accounts

- Sign-up gives the same answer whether or not an email already has an account, so it can't be used to find out who uses Bubble. The owner of the address gets an email saying someone tried.
- Passwords need at least 10 characters and are checked against known breaches. After 5 wrong passwords for one email in 15 minutes, sign-in for that email pauses until the window ends, whichever network the guesses come from.
- Emails never include the name someone typed, since anyone can sign up with any name and any address. Each address gets at most 3 emails a day, and the app has a daily email budget, so nobody can flood an inbox or use up the free sending allowance.
- Journal saves, mood check-ins and AI messages have per-person caps, and the AI has a daily budget for the whole app, so one person can't use up the free AI quota or fill the database for everyone. Crisis replies and helplines still work past every limit.
- Personal API responses are marked not to be cached, and changes to journal or mood data are refused if they come from another website.

## Still to do

- A review of the privacy policy and terms by someone qualified in POPIA, and the before-launch items in the handover (a Bubble contact address instead of a personal one, Groq's data retention).
- A check on the AI's own replies when the risk is `concern` or `crisis`, in case a manipulated model says something harmful.
- Field-level encryption of journal entries at rest.
- Checking the SADAG and Lifeline numbers against their own websites before launch.
