import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBestEffort } from "./openaiService";

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
