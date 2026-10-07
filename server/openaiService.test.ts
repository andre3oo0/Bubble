import { describe, expect, it } from "vitest";
import { z } from "zod";
import { hasWords, parseBestEffort, reasoningFor, requireWords } from "./openaiService";

// Models without strict structured outputs (e.g. Qwen on Groq) only try to match the
// schema, so their replies are checked here before Bubble uses them
const schema = z.object({ reply: z.string(), risk: z.enum(["none", "concern", "crisis"]) });

describe("parseBestEffort", () => {
  it("reads a plain JSON reply", () => {
    expect(parseBestEffort('{"reply":"I\'m so sorry.","risk":"none"}', schema)).toEqual({
      reply: "I'm so sorry.",
      risk: "none",
    });
  });

  it("ignores the model's thinking and a code fence around the JSON", () => {
    const content = '<think>They lost someone.</think>\n```json\n{"reply":"Oh no.","risk":"none"}\n```';
    expect(parseBestEffort(content, schema)).toEqual({ reply: "Oh no.", risk: "none" });
  });

  it("rejects replies that don't fit, so the safe fallback is used", () => {
    expect(() => parseBestEffort("Sorry, I can't help with that.", schema)).toThrow();
    expect(() => parseBestEffort('{"reply":"hi"}', schema)).toThrow();
    expect(() => parseBestEffort('{"reply":"hi","risk":"maybe"}', schema)).toThrow();
    expect(() => parseBestEffort(null, schema)).toThrow();
  });
});

describe("hasWords", () => {
  it("accepts real replies", () => {
    expect(hasWords("Hi there! I'm here.")).toBe(true);
    expect(hasWords("Ngiyabonga")).toBe(true);
    expect(() => requireWords("A title", "A summary")).not.toThrow();
  });

  it("rejects empty or dots-only replies, so the caller falls back", () => {
    expect(hasWords("")).toBe(false);
    expect(hasWords("   ")).toBe(false);
    expect(hasWords(". .  ...........")).toBe(false);
    expect(hasWords("\u22ee\n\u22ee")).toBe(false);
    expect(() => requireWords("A fine title", "")).toThrow();
  });
});

describe("reasoningFor", () => {
  it("turns Qwen's thinking off, which made replies slow", () => {
    expect(reasoningFor("qwen/qwen3.8-27b")).toEqual({ reasoning_effort: "none" });
  });

  it("keeps medium for gpt-oss and o-series models", () => {
    expect(reasoningFor("openai/gpt-oss-120b")).toEqual({ reasoning_effort: "medium" });
    expect(reasoningFor("o4-mini")).toEqual({ reasoning_effort: "medium" });
  });

  it("sends nothing to models that reject the setting", () => {
    expect(reasoningFor("gpt-4.1-mini")).toEqual({});
  });

  it("follows OPENAI_REASONING_EFFORT", () => {
    expect(reasoningFor("qwen/qwen3.8-27b", "medium")).toEqual({ reasoning_effort: "medium" });
    expect(reasoningFor("openai/gpt-oss-120b", "low")).toEqual({ reasoning_effort: "low" });
    expect(reasoningFor("openai/gpt-oss-120b", "none")).toEqual({});
  });
});
