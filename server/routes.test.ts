import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import type { ChatResponse } from "@shared/chat";
import { CRISIS_REPLY, HELPLINES } from "@shared/safety";

vi.mock("./openaiService", () => ({ generateReply: vi.fn(), generateReflection: vi.fn() }));

const { generateReflection, generateReply } = await import("./openaiService");
const { registerRoutes } = await import("./routes");
const { migrateDatabase } = await import("./db");
const { usageKey } = await import("./usage");
const mockReply = vi.mocked(generateReply);
const mockReflection = vi.mocked(generateReflection);

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  // chat counts usage in the database
  await migrateDatabase();
  const app = express();
  app.use(express.json());
  server = await registerRoutes(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  mockReply.mockReset();
  mockReflection.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function chat(body: unknown) {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as ChatResponse };
}

describe("POST /api/chat", () => {
  it("returns the AI reply with the user's mood", async () => {
    mockReply.mockResolvedValue({ reply: "That sounds a lot to carry.", mood: "anxious", risk: "none" });

    const { status, data } = await chat({ message: "I feel anxious about tomorrow" });

    expect(status).toBe(200);
    expect(data.reply).toBe("That sounds a lot to carry.");
    expect(data.mood).toBe("anxious");
    expect(data.risk).toBe("none");
    expect(data.helplines).toBeUndefined();
    expect(data.fallback).toBeUndefined();
  });

  it("adds helplines when the model flags a crisis", async () => {
    mockReply.mockResolvedValue({ reply: "I'm really glad you told me.", mood: "sad", risk: "crisis" });

    const { data } = await chat({ message: "I can't see a way forward" });

    expect(data.risk).toBe("crisis");
    expect(data.helplines).toEqual(HELPLINES);
  });

  it("treats crisis keywords as a crisis even if the model doesn't", async () => {
    mockReply.mockResolvedValue({ reply: "Tell me more.", mood: "sad", risk: "none" });

    const { data } = await chat({ message: "I want to end it all" });

    expect(data.risk).toBe("crisis");
    expect(data.helplines).toEqual(HELPLINES);
  });

  it("still responds to a crisis when the AI is down", async () => {
    mockReply.mockRejectedValue(new Error("OpenAI unavailable"));

    const { status, data } = await chat({ message: "I don't want to be alive anymore" });

    expect(status).toBe(200);
    expect(data.reply).toBe(CRISIS_REPLY);
    expect(data.helplines).toEqual(HELPLINES);
    expect(data.fallback).toBe(true);
  });

  it("falls back to a mood-based reply from the user's words when the AI is down", async () => {
    mockReply.mockRejectedValue(new Error("OpenAI unavailable"));

    const { data } = await chat({ message: "I'm so stressed about work" });

    expect(data.mood).toBe("stressed");
    expect(data.risk).toBe("none");
    expect(data.fallback).toBe(true);
    expect(data.reply.length).toBeGreaterThan(0);
  });

  it("keeps conversation history per session", async () => {
    mockReply.mockResolvedValue({ reply: "first reply", mood: "neutral", risk: "none" });
    const first = await chat({ message: "hello" });

    mockReply.mockResolvedValue({ reply: "second reply", mood: "neutral", risk: "none" });
    await chat({ message: "again", sessionId: first.data.sessionId });

    expect(mockReply).toHaveBeenLastCalledWith(
      "again",
      [
        { role: "user", content: "hello" },
        { role: "assistant", content: "first reply" },
      ],
      { name: undefined },
    );
  });

  it("remembers well beyond the last five exchanges", async () => {
    mockReply.mockResolvedValue({ reply: "ok", mood: "neutral", risk: "none" });
    let sessionId: string | undefined;
    for (let i = 0; i < 9; i++) {
      sessionId = (await chat({ message: `message ${i}`, sessionId })).data.sessionId;
    }

    const history = mockReply.mock.calls.at(-1)![1];
    expect(history).toHaveLength(16);
    expect(history[0]).toEqual({ role: "user", content: "message 0" });
  });

  it("keeps the context to a character budget when messages are long", async () => {
    mockReply.mockResolvedValue({ reply: "ok", mood: "neutral", risk: "none" });
    let sessionId: string | undefined;
    for (let i = 0; i < 8; i++) {
      sessionId = (await chat({ message: `${i} ${"x".repeat(1900)}`, sessionId })).data.sessionId;
    }

    const history = mockReply.mock.calls.at(-1)![1];
    const chars = history.reduce((total, turn) => total + turn.content.length, 0);
    expect(chars).toBeLessThanOrEqual(8000);
    expect(history.at(-1)!.role).toBe("assistant");
  });

  it.each([{}, { message: "   " }, { message: "x".repeat(2001) }, { message: "hi", sessionId: "not-a-uuid" }])(
    "rejects invalid body %#",
    async (body) => {
      const { status } = await chat(body);
      expect(status).toBe(400);
      expect(mockReply).not.toHaveBeenCalled();
    },
  );
});

describe("daily chat limit", () => {
  const original = process.env.CHAT_DAILY_LIMIT_GUEST;
  afterAll(() => {
    process.env.CHAT_DAILY_LIMIT_GUEST = original;
  });

  it("stops calling the AI once the guest limit is used up", async () => {
    process.env.CHAT_DAILY_LIMIT_GUEST = "0";
    mockReply.mockResolvedValue({ reply: "should not be used", mood: "neutral", risk: "none" });

    const { status, data } = await chat({ message: "hello again" });

    expect(status).toBe(200);
    expect(data.limited).toBe(true);
    expect(data.reply).toMatch(/today's limit/);
    expect(data.reply).toMatch(/free account/);
    expect(mockReply).not.toHaveBeenCalled();
  });

  it("still answers a crisis with helplines over the limit", async () => {
    process.env.CHAT_DAILY_LIMIT_GUEST = "0";

    const { data } = await chat({ message: "I want to end it all" });

    expect(data.limited).toBe(true);
    expect(data.risk).toBe("crisis");
    expect(data.reply).toBe(CRISIS_REPLY);
    expect(data.helplines).toEqual(HELPLINES);
    expect(mockReply).not.toHaveBeenCalled();
  });
});

async function post(path: string, body: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const transcript = [
  { role: "user", content: "Exams are making me panic" },
  { role: "assistant", content: "That sounds stressful. What feels hardest?" },
  { role: "user", content: "Maths, mostly" },
];

describe("POST /api/chat/reflect", () => {
  it("returns the AI reflection without helplines for an ordinary chat", async () => {
    mockReflection.mockResolvedValue({ title: "Exam nerves", summary: "You talked about maths.", takeaway: "One topic at a time." });

    const { status, data } = await post("/api/chat/reflect", { transcript });

    expect(status).toBe(200);
    expect(data).toEqual({ title: "Exam nerves", summary: "You talked about maths.", takeaway: "One topic at a time." });
    expect(mockReflection).toHaveBeenCalledWith(transcript);
  });

  it("falls back to a written prompt when the AI is down", async () => {
    mockReflection.mockRejectedValue(new Error("AI unavailable"));

    const { status, data } = await post("/api/chat/reflect", { transcript });

    expect(status).toBe(200);
    expect(data.fallback).toBe(true);
    expect(data.summary.length).toBeGreaterThan(0);
    expect(data.takeaway.length).toBeGreaterThan(0);
  });

  it("adds helplines if anything the person said suggests a crisis, even with the AI down", async () => {
    mockReflection.mockRejectedValue(new Error("AI unavailable"));

    const { data } = await post("/api/chat/reflect", {
      transcript: [...transcript, { role: "user", content: "honestly I want to end it all" }],
    });

    expect(data.helplines).toEqual(HELPLINES);
  });

  it("only sends the most recent part of a very long chat", async () => {
    mockReflection.mockResolvedValue({ title: "t", summary: "s", takeaway: "k" });
    const long = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `${i} ${"x".repeat(1900)}` }));

    await post("/api/chat/reflect", { transcript: long });

    const sent = mockReflection.mock.calls[0][0];
    expect(sent.length).toBeLessThan(long.length);
    expect(sent.at(-1)).toEqual(long.at(-1));
  });

  it.each([{}, { transcript: [] }, { transcript: [{ role: "system", content: "hi" }] }])("rejects invalid body %#", async (body) => {
    const { status } = await post("/api/chat/reflect", body);
    expect(status).toBe(400);
    expect(mockReflection).not.toHaveBeenCalled();
  });

  it("doesn't call the AI over the daily limit, but keeps the helplines", async () => {
    const original = process.env.CHAT_DAILY_LIMIT_GUEST;
    process.env.CHAT_DAILY_LIMIT_GUEST = "0";
    try {
      const { data } = await post("/api/chat/reflect", { transcript: [{ role: "user", content: "I want to die" }] });
      expect(data.fallback).toBe(true);
      expect(data.helplines).toEqual(HELPLINES);
      expect(mockReflection).not.toHaveBeenCalled();
    } finally {
      process.env.CHAT_DAILY_LIMIT_GUEST = original;
    }
  });
});

describe("POST /api/chat/end", () => {
  it("forgets the conversation, so the next message starts fresh", async () => {
    mockReply.mockResolvedValue({ reply: "noted", mood: "neutral", risk: "none" });
    const first = await chat({ message: "something private" });

    expect((await post("/api/chat/end", { sessionId: first.data.sessionId })).status).toBe(204);

    await chat({ message: "hello", sessionId: first.data.sessionId });
    expect(mockReply).toHaveBeenLastCalledWith("hello", [], { name: undefined });
  });

  it("ignores a bad session id", async () => {
    expect((await post("/api/chat/end", { sessionId: "nope" })).status).toBe(204);
  });
});

describe("usageKey", () => {
  it("keys signed-in users by id with the user limit", () => {
    expect(usageKey("abc123", "10.0.0.1")).toEqual({ key: "user:abc123", limit: 1000 });
  });

  it("never stores a guest's raw IP", () => {
    const { key } = usageKey(undefined, "203.0.113.7");
    expect(key).toMatch(/^ip:[0-9a-f]{32}$/);
    expect(key).not.toContain("203.0.113.7");
    expect(usageKey(undefined, "203.0.113.7").key).toBe(key);
    expect(usageKey(undefined, "203.0.113.8").key).not.toBe(key);
  });
});

describe("GET /api/auth-options", () => {
  it("hides Google sign-in when it isn't set up", async () => {
    const res = await fetch(`${baseUrl}/api/auth-options`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ google: false });
  });
});
