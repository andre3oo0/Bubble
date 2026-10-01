import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { eq } from "drizzle-orm";
import type { JournalEntry, MoodCheckin } from "@shared/api";
import { account, user } from "@shared/schema";
import { createApp } from "./app";
import { db, migrateDatabase } from "./db";

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
