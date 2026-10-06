import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { eq } from "drizzle-orm";
import type { JournalEntry, MoodCheckin } from "@shared/api";
import { account, journalEntries, moodCheckins, session, user } from "@shared/schema";
import { HELPLINES } from "@shared/safety";
import { LEGAL_VERSION } from "@shared/legal";

// Capture outgoing email instead of sending or printing it
vi.mock("./email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./email")>()),
  sendEmail: vi.fn(),
}));

// The AI is never called for real; the chat test below checks what it's given
vi.mock("./openaiService", () => ({ generateReply: vi.fn(), generateReflection: vi.fn(), generateEntryReflection: vi.fn() }));

// The breached-password service is never called; one test switches the check on
vi.mock("./passwordCheck", () => ({ isBreachedPassword: vi.fn(async () => false), breachCheckEnabled: vi.fn(() => false) }));

const { sendEmail } = await import("./email");
const { generateEntryReflection, generateReply } = await import("./openaiService");
const mockEntryReflection = vi.mocked(generateEntryReflection);
const { createApp } = await import("./app");
const { db, migrateDatabase } = await import("./db");
const sentEmails = vi.mocked(sendEmail);
const passwordCheck = await import("./passwordCheck");

const ORIGIN = process.env.BETTER_AUTH_URL!;
const PASSWORD = "correct-horse-battery";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await migrateDatabase();
  ({ server } = await createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

function request(method: string, path: string, { cookie, body }: { cookie?: string; body?: unknown } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Origin: ORIGIN,
      ...(body !== undefined && { "Content-Type": "application/json" }),
      ...(cookie && { Cookie: cookie }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function cookieFrom(res: Response) {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

let emailCounter = 0;
const newEmail = () => `user${++emailCounter}-${Date.now()}@example.com`;

// Sign-up doesn't sign in by itself (so it can't reveal existing accounts); the app
// signs in straight after, and so does this
async function signUp() {
  const email = newEmail();
  const res = await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name: "Test User", email, password: PASSWORD },
  });
  expect(res.status).toBe(200);
  const signedIn = await request("POST", "/api/auth/sign-in/email", { body: { email, password: PASSWORD } });
  expect(signedIn.status).toBe(200);
  return { email, cookie: cookieFrom(signedIn) };
}

async function addEntry(cookie: string, title = "Before the exam") {
  const res = await request("POST", "/api/journal", {
    cookie,
    body: { title, content: "Felt tense, breathing helped.", mood: "calm" },
  });
  expect(res.status).toBe(201);
  return (await res.json()) as JournalEntry;
}

describe("auth", () => {
  it("stores a hash, not the password", async () => {
    const { email } = await signUp();
    const [row] = await db
      .select({ password: account.password })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(eq(user.email, email));

    expect(row.password).toBeTruthy();
    expect(row.password).not.toContain(PASSWORD);
  });

  it("rejects a wrong password", async () => {
    const { email } = await signUp();
    const res = await request("POST", "/api/auth/sign-in/email", { body: { email, password: "wrong-password" } });
    expect(res.status).not.toBe(200);
  });

  it("signs in with the right password", async () => {
    const { email } = await signUp();
    const res = await request("POST", "/api/auth/sign-in/email", { body: { email, password: PASSWORD } });
    expect(res.status).toBe(200);
    expect(cookieFrom(res)).toContain("session_token");
  });

  it("ends the session on sign out", async () => {
    const { cookie } = await signUp();
    const out = await request("POST", "/api/auth/sign-out", { cookie, body: {} });
    expect(out.status).toBe(200);

    const res = await request("GET", "/api/journal", { cookie });
    expect(res.status).toBe(401);
  });
});

describe("journal", () => {
  it.each([
    ["GET", "/api/journal"],
    ["POST", "/api/journal"],
    ["GET", "/api/moods"],
    ["POST", "/api/moods"],
  ])("%s %s needs a session", async (method, path) => {
    const res = await request(method, path, { body: method === "POST" ? { mood: "calm" } : undefined });
    expect(res.status).toBe(401);
  });

  it("creates and lists entries, newest first", async () => {
    const { cookie } = await signUp();
    await addEntry(cookie, "first");
    await addEntry(cookie, "second");

    const res = await request("GET", "/api/journal", { cookie });
    const entries = (await res.json()) as JournalEntry[];
    expect(entries.map((e) => e.title)).toEqual(["second", "first"]);
    expect(entries[0].mood).toBe("calm");
  });

  it.each([
    { content: "text", mood: "calm" },
    { title: "t", mood: "calm" },
    { title: "t", content: "text", mood: "furious" },
    { title: "   ", content: "text", mood: "calm" },
  ])("rejects invalid entry %#", async (body) => {
    const { cookie } = await signUp();
    const res = await request("POST", "/api/journal", { cookie, body });
    expect(res.status).toBe(400);
  });

  it("updates and deletes your own entry", async () => {
    const { cookie } = await signUp();
    const entry = await addEntry(cookie);

    const updated = await request("PATCH", `/api/journal/${entry.id}`, { cookie, body: { title: "After the exam" } });
    expect(updated.status).toBe(200);
    expect(((await updated.json()) as JournalEntry).title).toBe("After the exam");

    const deleted = await request("DELETE", `/api/journal/${entry.id}`, { cookie });
    expect(deleted.status).toBe(204);
    const list = (await (await request("GET", "/api/journal", { cookie })).json()) as JournalEntry[];
    expect(list).toEqual([]);
  });

  it("keeps entries private between users", async () => {
    const alice = await signUp();
    const bob = await signUp();
    const entry = await addEntry(alice.cookie);

    const bobList = (await (await request("GET", "/api/journal", { cookie: bob.cookie })).json()) as JournalEntry[];
    expect(bobList).toEqual([]);

    const bobUpdate = await request("PATCH", `/api/journal/${entry.id}`, { cookie: bob.cookie, body: { title: "hacked" } });
    expect(bobUpdate.status).toBe(404);
    const bobDelete = await request("DELETE", `/api/journal/${entry.id}`, { cookie: bob.cookie });
    expect(bobDelete.status).toBe(404);

    const aliceList = (await (await request("GET", "/api/journal", { cookie: alice.cookie })).json()) as JournalEntry[];
    expect(aliceList.map((e) => e.title)).toEqual(["Before the exam"]);
  });

  it("returns 404 for a malformed id", async () => {
    const { cookie } = await signUp();
    const res = await request("DELETE", "/api/journal/not-a-uuid", { cookie });
    expect(res.status).toBe(404);
  });
});

describe("mood check-ins", () => {
  it("saves and lists your check-ins only", async () => {
    const alice = await signUp();
    const bob = await signUp();

    const created = await request("POST", "/api/moods", { cookie: alice.cookie, body: { mood: "anxious" } });
    expect(created.status).toBe(201);

    const aliceMoods = (await (await request("GET", "/api/moods", { cookie: alice.cookie })).json()) as MoodCheckin[];
    expect(aliceMoods.map((m) => m.mood)).toEqual(["anxious"]);
    const bobMoods = (await (await request("GET", "/api/moods", { cookie: bob.cookie })).json()) as MoodCheckin[];
    expect(bobMoods).toEqual([]);
  });

  it("rejects an unknown mood", async () => {
    const { cookie } = await signUp();
    const res = await request("POST", "/api/moods", { cookie, body: { mood: "furious" } });
    expect(res.status).toBe(400);
  });
});

it("answers unknown API routes with JSON 404", async () => {
  const res = await request("POST", "/api/reminders/add");
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "Not found" });
});

describe("reflect on a journal entry", () => {
  beforeEach(() => {
    mockEntryReflection.mockReset();
    // The route logs the AI failure; keep the test output clean, as routes.test does
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("reflects on your own entry", async () => {
    mockEntryReflection.mockResolvedValue({ reflection: "You stayed with it.", question: "What helped most?" });
    const { cookie } = await signUp();
    const entry = await addEntry(cookie);

    const res = await request("POST", `/api/journal/${entry.id}/reflect`, { cookie });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reflection: "You stayed with it.", question: "What helped most?" });
    expect(mockEntryReflection).toHaveBeenCalledWith({ title: entry.title, content: entry.content, mood: entry.mood });
  });

  it("never reads someone else's entry", async () => {
    const owner = await signUp();
    const other = await signUp();
    const entry = await addEntry(owner.cookie, "Mine only");

    const res = await request("POST", `/api/journal/${entry.id}/reflect`, { cookie: other.cookie });

    expect(res.status).toBe(404);
    expect(mockEntryReflection).not.toHaveBeenCalled();
  });

  it("needs a session", async () => {
    const { cookie } = await signUp();
    const entry = await addEntry(cookie);
    expect((await request("POST", `/api/journal/${entry.id}/reflect`)).status).toBe(401);
  });

  it("falls back, and still shows helplines for crisis words, when the AI is down", async () => {
    const { cookie } = await signUp();
    const res = await request("POST", "/api/journal", {
      cookie,
      body: { title: "Tonight", content: "Some nights I want to die.", mood: "sad" },
    });
    const entry = (await res.json()) as JournalEntry;
    mockEntryReflection.mockRejectedValue(new Error("AI unavailable"));

    const reflected = await request("POST", `/api/journal/${entry.id}/reflect`, { cookie });
    const data = await reflected.json();

    expect(reflected.status).toBe(200);
    expect(data.fallback).toBe(true);
    expect(data.helplines).toEqual(HELPLINES);
  });

  it("returns 404 for a malformed id", async () => {
    const { cookie } = await signUp();
    expect((await request("POST", "/api/journal/not-an-id/reflect", { cookie })).status).toBe(404);
  });
});

describe("chat when signed in", () => {
  it("tells Bubble the person's name", async () => {
    vi.mocked(generateReply).mockResolvedValue({ reply: "Hey!", mood: "neutral", risk: "none" });
    const { cookie } = await signUp();

    const res = await request("POST", "/api/chat", { cookie, body: { message: "hi" } });

    expect(res.status).toBe(200);
    expect(vi.mocked(generateReply)).toHaveBeenLastCalledWith("hi", [], { name: "Test User" });
  });
});

describe("android asset links", () => {
  const assetLinks = async () => {
    const res = await request("GET", "/.well-known/assetlinks.json");
    return { status: res.status, body: res.status === 200 ? await res.json() : null };
  };

  it("serves the current APK's details by default", async () => {
    const { status, body } = await assetLinks();
    expect(status).toBe(200);
    expect(body[0].relation).toEqual(["delegate_permission/common.handle_all_urls"]);
    expect(body[0].target.package_name).toBe("com.onrender.bubble_1_kafq.twa");
    expect(body[0].target.sha256_cert_fingerprints).toHaveLength(1);
  });

  it("lets the settings swap in another package and every fingerprint", async () => {
    vi.stubEnv("ANDROID_PACKAGE_NAME", "app.bubble.test");
    vi.stubEnv("ANDROID_CERT_SHA256", "AA:BB, CC:DD");
    const { status, body } = await assetLinks();
    vi.unstubAllEnvs();
    expect(status).toBe(200);
    expect(body).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "app.bubble.test", sha256_cert_fingerprints: ["AA:BB", "CC:DD"] },
      },
    ]);
  });

  it("can be switched off", async () => {
    vi.stubEnv("ANDROID_PACKAGE_NAME", "none");
    const { status } = await assetLinks();
    vi.unstubAllEnvs();
    expect(status).toBe(404);
  });
});

function linkIn(text: string) {
  return text.match(/https?:\/\/\S+/)![0];
}

describe("email verification", () => {
  beforeEach(() => sentEmails.mockClear());

  it("sends a confirmation email on sign up", async () => {
    const { email } = await signUp();
    await vi.waitFor(() => expect(sentEmails).toHaveBeenCalled());
    const [message] = sentEmails.mock.calls.at(-1)!;
    expect(message.to).toBe(email);
    expect(message.subject).toMatch(/confirm your email/i);
    expect(linkIn(message.text)).toContain("/api/auth/verify-email");
  });
});

describe("password reset", () => {
  beforeEach(() => sentEmails.mockClear());

  it("resets the password from the emailed link and signs out other sessions", async () => {
    const { email, cookie } = await signUp();
    sentEmails.mockClear();

    const requested = await request("POST", "/api/auth/request-password-reset", {
      body: { email, redirectTo: `${ORIGIN}/reset-password` },
    });
    expect(requested.status).toBe(200);
    await vi.waitFor(() => expect(sentEmails).toHaveBeenCalled());
    const [message] = sentEmails.mock.calls.at(-1)!;
    expect(message.to).toBe(email);

    // The link points at the auth server, which redirects to our page with the token
    const link = new URL(linkIn(message.text));
    const redirect = await fetch(`${baseUrl}${link.pathname}${link.search}`, { redirect: "manual", headers: { Origin: ORIGIN } });
    expect(redirect.status).toBe(302);
    const token = new URL(redirect.headers.get("location")!).searchParams.get("token");
    expect(token).toBeTruthy();

    const reset = await request("POST", "/api/auth/reset-password", { body: { newPassword: "a-brand-new-password", token } });
    expect(reset.status).toBe(200);

    expect((await request("GET", "/api/journal", { cookie })).status).toBe(401);
    const oldPassword = await request("POST", "/api/auth/sign-in/email", { body: { email, password: PASSWORD } });
    expect(oldPassword.status).not.toBe(200);
    const newPassword = await request("POST", "/api/auth/sign-in/email", { body: { email, password: "a-brand-new-password" } });
    expect(newPassword.status).toBe(200);
  });

  it("doesn't reveal whether an email has an account", async () => {
    const res = await request("POST", "/api/auth/request-password-reset", {
      body: { email: "nobody-here@example.com", redirectTo: `${ORIGIN}/reset-password` },
    });
    expect(res.status).toBe(200);
    expect(sentEmails).not.toHaveBeenCalled();
  });

  it("rejects a made-up token", async () => {
    const res = await request("POST", "/api/auth/reset-password", { body: { newPassword: "whatever-password", token: "fake" } });
    expect(res.status).not.toBe(200);
  });
});

describe("change password", () => {
  it("needs the current password, then signs out other sessions", async () => {
    const { email, cookie } = await signUp();
    const other = cookieFrom(await request("POST", "/api/auth/sign-in/email", { body: { email, password: PASSWORD } }));

    const wrong = await request("POST", "/api/auth/change-password", {
      cookie,
      body: { currentPassword: "not-my-password", newPassword: "a-brand-new-password", revokeOtherSessions: true },
    });
    expect(wrong.status).not.toBe(200);

    const changed = await request("POST", "/api/auth/change-password", {
      cookie,
      body: { currentPassword: PASSWORD, newPassword: "a-brand-new-password", revokeOtherSessions: true },
    });
    expect(changed.status).toBe(200);

    expect((await request("GET", "/api/journal", { cookie: other })).status).toBe(401);
    const oldPassword = await request("POST", "/api/auth/sign-in/email", { body: { email, password: PASSWORD } });
    expect(oldPassword.status).not.toBe(200);
    const newPassword = await request("POST", "/api/auth/sign-in/email", { body: { email, password: "a-brand-new-password" } });
    expect(newPassword.status).toBe(200);
  });
});

describe("export and delete", () => {
  it("exports only your own data", async () => {
    const alice = await signUp();
    const bob = await signUp();
    await addEntry(alice.cookie, "alice's entry");
    await addEntry(bob.cookie, "bob's entry");
    await request("POST", "/api/moods", { cookie: alice.cookie, body: { mood: "calm" } });

    const res = await request("GET", "/api/me/export", { cookie: alice.cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="bubble-data-/);
    const data = await res.json();
    expect(data.account.email).toBe(alice.email);
    expect(data.journalEntries.map((e: JournalEntry) => e.title)).toEqual(["alice's entry"]);
    expect(data.moodCheckins).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain("password");
  });

  it("needs a session to export", async () => {
    expect((await request("GET", "/api/me/export")).status).toBe(401);
  });

  it("deletes the account and everything in it, and nobody else's", async () => {
    const alice = await signUp();
    const bob = await signUp();
    await addEntry(alice.cookie);
    await request("POST", "/api/moods", { cookie: alice.cookie, body: { mood: "sad" } });
    await addEntry(bob.cookie);

    const wrong = await request("POST", "/api/auth/delete-user", { cookie: alice.cookie, body: { password: "not-my-password" } });
    expect(wrong.status).not.toBe(200);

    const deleted = await request("POST", "/api/auth/delete-user", { cookie: alice.cookie, body: { password: PASSWORD } });
    expect(deleted.status).toBe(200);

    const [aliceRow] = await db.select().from(user).where(eq(user.email, alice.email));
    expect(aliceRow).toBeUndefined();
    const [bobRow] = await db.select().from(user).where(eq(user.email, bob.email));
    const leftover = await db.select().from(journalEntries).where(eq(journalEntries.userId, bobRow.id));
    expect(leftover).toHaveLength(1);
    const orphanMoods = await db.select().from(moodCheckins).where(eq(moodCheckins.mood, "sad"));
    expect(orphanMoods).toHaveLength(0);

    expect((await request("GET", "/api/journal", { cookie: alice.cookie })).status).toBe(401);
  });
});

describe("security", () => {
  beforeEach(() => sentEmails.mockClear());

  // Everything printed while `fn` runs, so we can check nobody's words end up in the logs
  async function consoleDuring(fn: () => Promise<unknown>) {
    const lines: string[] = [];
    const capture = (...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? `${a.message} ${String(a.cause)}` : String(a))).join(" "));
    };
    const spies = (["error", "warn", "log", "info"] as const).map((level) => vi.spyOn(console, level).mockImplementation(capture));
    try {
      await fn();
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    return lines.join("\n");
  }

  it("never logs a journal entry when saving it fails", async () => {
    const { cookie } = await signUp();
    const secret = "my private words about tonight";
    const failure = new Error(`Failed query: insert into "journal_entry" params: ${secret}`, {
      cause: Object.assign(new Error("could not extend file"), { code: "53100" }),
    });
    const insert = vi.spyOn(db, "insert").mockImplementationOnce(() => {
      throw failure;
    });

    let res!: Response;
    const output = await consoleDuring(async () => {
      res = await request("POST", "/api/journal", { cookie, body: { title: "Tonight", content: secret, mood: "sad" } });
    });
    insert.mockRestore();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong" });
    expect(output).toContain("POST /api/journal 500");
    expect(output).toContain("53100");
    expect(output).not.toContain(secret);
  });

  it("never logs or echoes a malformed request body", async () => {
    const { cookie } = await signUp();
    const secret = "MY PRIVATE JOURNAL TEXT";
    let res!: Response;
    const output = await consoleDuring(async () => {
      res = await fetch(`${baseUrl}/api/journal`, {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/json", Cookie: cookie },
        body: `{"content":"${secret}",}`,
      });
    });
    const body = await res.text();

    expect(res.status).toBe(400);
    expect(body).not.toContain(secret);
    expect(output).not.toContain(secret);
  });

  it("answers sign-up the same way whether or not the email has an account", async () => {
    const { email } = await signUp();
    sentEmails.mockClear();

    const again = await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name: "Someone", email, password: "another-long-password" } });
    const fresh = await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name: "Someone", email: newEmail(), password: "another-long-password" } });

    expect(again.status).toBe(fresh.status);
    const [a, b] = [await again.json(), await fresh.json()];
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    expect(Object.keys(a.user).sort()).toEqual(Object.keys(b.user).sort());
    expect(a.token).toBeNull();
    expect(cookieFrom(again)).toBe("");
    // The real owner hears about it instead
    await vi.waitFor(() => expect(sentEmails.mock.calls.some(([m]) => m.to === email && /tried to sign up/i.test(m.subject))).toBe(true));
  });

  it.each([
    ["too long", "x".repeat(51)],
    ["a link", "Visit https://evil.example"],
    ["a web address", "www.evil.example"],
    ["markup", "<b>Sam</b>"],
  ])("rejects a name that is %s", async (_label, name) => {
    const res = await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name, email: newEmail(), password: PASSWORD } });
    expect(res.status).toBe(400);
  });

  it("rejects a name with a link when it's changed later", async () => {
    const { cookie } = await signUp();
    const res = await request("POST", "/api/auth/update-user", { cookie, body: { name: "see http://evil.example" } });
    expect(res.status).toBe(400);
  });

  it("needs a password of at least 10 characters", async () => {
    const res = await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name: "Sam", email: newEmail(), password: "123456789" } });
    expect(res.status).toBe(400);
  });

  it("keeps the name out of emails", async () => {
    const email = newEmail();
    await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name: "Sam Mokoena", email, password: PASSWORD } });
    await vi.waitFor(() => expect(sentEmails).toHaveBeenCalled());
    const [message] = sentEmails.mock.calls.at(-1)!;
    expect(message.text).not.toContain("Sam");
    expect(message.html).not.toContain("Sam");
  });

  it("sends at most 3 emails to one address a day", async () => {
    const { email } = await signUp();
    for (let i = 0; i < 4; i++) {
      await request("POST", "/api/auth/request-password-reset", { body: { email, redirectTo: `${ORIGIN}/reset-password` } });
    }
    // The sign-up confirmation, then two of the four resets
    await vi.waitFor(() => expect(sentEmails.mock.calls.filter(([m]) => m.to === email)).toHaveLength(3));
  });

  it("stops sending email when the app's daily budget is spent", async () => {
    vi.stubEnv("EMAIL_DAILY_LIMIT", "0");
    const email = newEmail();
    await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name: "Sam", email, password: PASSWORD } });
    vi.unstubAllEnvs();
    expect(sentEmails.mock.calls.filter(([m]) => m.to === email)).toHaveLength(0);
  });

  it("slows down guessing one account's password, from any IP", async () => {
    const { email } = await signUp();
    for (let i = 0; i < 5; i++) {
      const wrong = await request("POST", "/api/auth/sign-in/email", { body: { email, password: `wrong-password-${i}` } });
      expect(wrong.status).toBe(401);
    }
    const right = await request("POST", "/api/auth/sign-in/email", { body: { email, password: PASSWORD } });
    expect(right.status).toBe(429);
  });

  it("rejects a password that's been in a data breach", async () => {
    vi.mocked(passwordCheck.breachCheckEnabled).mockReturnValue(true);
    vi.mocked(passwordCheck.isBreachedPassword).mockResolvedValueOnce(true);
    const res = await request("POST", "/api/auth/sign-up/email", {
    body: { acceptedTerms: LEGAL_VERSION, name: "Sam", email: newEmail(), password: "password123" } });
    vi.mocked(passwordCheck.breachCheckEnabled).mockReturnValue(false);
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/data breach/);
  });

  it("doesn't store the IP address or browser of a session", async () => {
    const { email } = await signUp();
    const rows = await db
      .select({ ipAddress: session.ipAddress, userAgent: session.userAgent })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(eq(user.email, email));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.ipAddress).toBeNull();
      expect(row.userAgent).toBeNull();
    }
  });

  it("refuses writes sent from another website", async () => {
    const { cookie } = await signUp();
    const res = await fetch(`${baseUrl}/api/journal`, {
      method: "POST",
      headers: { Origin: "https://evil.example", "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ title: "t", content: "text", mood: "calm" }),
    });
    expect(res.status).toBe(403);
  });

  it("asks browsers not to cache personal data", async () => {
    const { cookie } = await signUp();
    const res = await request("GET", "/api/journal", { cookie });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("caps journal entries per person", async () => {
    const { email, cookie } = await signUp();
    const [me] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    await db.insert(journalEntries).values(Array.from({ length: 2000 }, () => ({ userId: me.id, title: "t", content: "c", mood: "calm" })));

    const res = await request("POST", "/api/journal", { cookie, body: { title: "one more", content: "text", mood: "calm" } });
    expect(res.status).toBe(429);
  });

  it("caps mood check-ins per day", async () => {
    const { email, cookie } = await signUp();
    const [me] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    await db.insert(moodCheckins).values(Array.from({ length: 50 }, () => ({ userId: me.id, mood: "calm" })));

    const res = await request("POST", "/api/moods", { cookie, body: { mood: "calm" } });
    expect(res.status).toBe(429);
  });

  it("includes sign-in methods and sessions in the export, without IPs or tokens", async () => {
    const { cookie } = await signUp();
    const data = await (await request("GET", "/api/me/export", { cookie })).json();
    expect(data.signInMethods).toEqual([expect.objectContaining({ method: "email" })]);
    expect(data.sessions.length).toBeGreaterThan(0);
    expect(Object.keys(data.sessions[0]).sort()).toEqual(["expiresAt", "startedAt"]);
  });
});

describe("terms and privacy consent", () => {
  it("won't create an account without agreeing", async () => {
    const res = await request("POST", "/api/auth/sign-up/email", { body: { name: "Sam", email: newEmail(), password: PASSWORD } });
    expect(res.status).toBe(400);
    const old = await request("POST", "/api/auth/sign-up/email", {
      body: { name: "Sam", email: newEmail(), password: PASSWORD, acceptedTerms: "2020-01-01" },
    });
    expect(old.status).toBe(400);
  });

  it("records the version and time agreed to at sign-up", async () => {
    const { email, cookie } = await signUp();
    const [row] = await db.select({ version: user.termsVersion, at: user.termsAcceptedAt }).from(user).where(eq(user.email, email));
    expect(row.version).toBe(LEGAL_VERSION);
    expect(row.at).toBeInstanceOf(Date);

    const session = await (await request("GET", "/api/auth/get-session", { cookie })).json();
    expect(session.user.termsVersion).toBe(LEGAL_VERSION);
    const exported = await (await request("GET", "/api/me/export", { cookie })).json();
    expect(exported.agreedTo.termsAndPrivacyVersion).toBe(LEGAL_VERSION);
  });

  it("can't be set through the account update", async () => {
    const { cookie } = await signUp();
    const res = await request("POST", "/api/auth/update-user", { cookie, body: { termsVersion: "made-up" } });
    expect(res.status).toBe(400);
  });

  it("lets a signed-in person agree to the current version, for their own account only", async () => {
    const alice = await signUp();
    const bob = await signUp();
    await db.update(user).set({ termsVersion: null, termsAcceptedAt: null }).where(eq(user.email, alice.email));
    await db.update(user).set({ termsVersion: null, termsAcceptedAt: null }).where(eq(user.email, bob.email));

    expect((await request("POST", "/api/me/consent", { cookie: alice.cookie, body: { version: "2020-01-01" } })).status).toBe(400);
    expect((await request("POST", "/api/me/consent", { cookie: alice.cookie, body: { version: LEGAL_VERSION } })).status).toBe(204);

    const [a] = await db.select({ version: user.termsVersion }).from(user).where(eq(user.email, alice.email));
    const [b] = await db.select({ version: user.termsVersion }).from(user).where(eq(user.email, bob.email));
    expect(a.version).toBe(LEGAL_VERSION);
    expect(b.version).toBeNull();
  });

  it("needs a session to agree", async () => {
    expect((await request("POST", "/api/me/consent", { body: { version: LEGAL_VERSION } })).status).toBe(401);
  });
});
