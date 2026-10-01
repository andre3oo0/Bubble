import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import type { ChatResponse } from "@shared/chat";
import { CRISIS_REPLY, HELPLINES } from "@shared/safety";

vi.mock("./openaiService", () => ({ generateReply: vi.fn() }));

const { generateReply } = await import("./openaiService");
const { registerRoutes } = await import("./routes");
const mockReply = vi.mocked(generateReply);

let server: Server;
let baseUrl: string;

beforeAll(async () => {
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

    expect(mockReply).toHaveBeenLastCalledWith("again", [
      { role: "user", content: "hello" },
      { role: "assistant", content: "first reply" },
    ]);
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
