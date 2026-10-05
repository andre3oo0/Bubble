import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { eq } from "drizzle-orm";
import type { JournalEntry, MoodCheckin } from "@shared/api";
import { account, journalEntries, moodCheckins, user } from "@shared/schema";

// Capture outgoing email instead of sending or printing it
vi.mock("./email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./email")>()),
  sendEmail: vi.fn(),
}));

// The AI is never called for real; the chat test below checks what it's given
vi.mock("./openaiService", () => ({ generateReply: vi.fn(), generateReflection: vi.fn() }));

const { sendEmail } = await import("./email");
const { generateReply } = await import("./openaiService");
const { createApp } = await import("./app");
const { db, migrateDatabase } = await import("./db");
const sentEmails = vi.mocked(sendEmail);

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
async function signUp() {
  const email = `user${++emailCounter}-${Date.now()}@example.com`;
  const res = await request("POST", "/api/auth/sign-up/email", {
    body: { name: "Test User", email, password: PASSWORD },
  });
  expect(res.status).toBe(200);
  return { email, cookie: cookieFrom(res) };
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
  it("is missing until the APK's details are set", async () => {
    vi.stubEnv("ANDROID_PACKAGE_NAME", "");
    expect((await request("GET", "/.well-known/assetlinks.json")).status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("lists the package and every fingerprint", async () => {
    vi.stubEnv("ANDROID_PACKAGE_NAME", "app.bubble.test");
    vi.stubEnv("ANDROID_CERT_SHA256", "AA:BB, CC:DD");
    const res = await request("GET", "/.well-known/assetlinks.json");
    vi.unstubAllEnvs();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "app.bubble.test", sha256_cert_fingerprints: ["AA:BB", "CC:DD"] },
      },
    ]);
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
