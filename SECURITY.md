# Security

Bubble holds sensitive, health-related information: journal entries, moods, and conversations in progress. Security reports are taken seriously.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through GitHub's [private vulnerability reporting](https://github.com/andre3oo0/Bubble/security/advisories/new) for this repository.

Include what you found, how to reproduce it, and what it could expose. You'll get a reply as soon as possible, and credit if you'd like it once a fix is out.

## What's in scope

- Anything that lets one person read or change another person's journal, moods or account
- Ways to make chat or journal content appear in logs, emails or other people's sessions
- Bypassing the crisis check or stopping helplines from showing
- Authentication, session and password reset problems
- Exposed secrets

## How Bubble protects data

A summary; the detail is in [docs/SAFETY.md](docs/SAFETY.md).

- Every journal and mood query is scoped to the signed-in user, with isolation tests.
- Chat messages aren't stored; the server keeps a short in-memory context that's cleared after an hour.
- Logs never contain chat or journal content, and IP addresses are never stored.
- Passwords are hashed by Better Auth, need 10 or more characters and are checked against known breaches; Google sign-in tokens are stored encrypted.
- Sign-up doesn't reveal whether an email already has an account. Login is rate-limited per visitor and per account.
- Password reset signs out every other session. Signing out clears the chat from the device.
- Secrets live only in the host's environment settings, never in the repository.
