import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake model that answers with whatever each test queues up, as Qwen on Groq would
// (best-effort outputs, so the reply arrives as JSON text)
const create = vi.hoisted(() => {
  process.env.OPENAI_MODEL = "qwen/qwen3.8-27b";
  return vi.fn();
});
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

const { careInstructions, generateReply, repeatsLastReply } = await import("./openaiService");

function modelSays(...replies: { reply: string; user_mood?: string; risk?: string }[]) {
  for (const { reply, user_mood = "sad", risk = "none" } of replies) {
    create.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ reply, user_mood, risk }) } }] });
  }
}

const previous = "Oh no, I'm sorry. Exams so close are a lot to carry.";
const history = [
  { role: "user" as const, content: "exams start next week" },
  { role: "assistant" as const, content: previous },
];

beforeEach(() => create.mockReset());

describe("repeatsLastReply", () => {
  it("spots Bubble's previous reply, ignoring case, spacing and punctuation", () => {
    expect(repeatsLastReply("oh no, im sorry.  Exams so close are a lot to carry", history)).toBe(true);
  });

  it("lets a different reply through", () => {
    expect(repeatsLastReply("Algebra blanks are so common under pressure.", history)).toBe(false);
    expect(repeatsLastReply(previous, [])).toBe(false);
  });
});

describe("generateReply", () => {
  it("uses a fresh reply straight away", async () => {
    modelSays({ reply: "Algebra blanks are so common under pressure." });
    const result = await generateReply("maths mostly", history);
    expect(result.reply).toBe("Algebra blanks are so common under pressure.");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("asks once more when the model repeats its previous reply", async () => {
    modelSays({ reply: previous }, { reply: "Algebra blanks are so common under pressure." });
    const result = await generateReply("maths mostly", history);
    expect(result.reply).toBe("Algebra blanks are so common under pressure.");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("gives no reply after a second repeat, so the caller falls back", async () => {
    modelSays({ reply: previous }, { reply: previous });
    expect((await generateReply("maths mostly", history)).reply).toBe("");
  });

  it("keeps a crisis either try spotted", async () => {
    modelSays({ reply: previous, risk: "crisis" }, { reply: "I'm really glad you told me.", risk: "none" });
    expect((await generateReply("I can't do this", history)).risk).toBe("crisis");
  });

  it("keeps the first reading when the second try fails", async () => {
    modelSays({ reply: previous, risk: "crisis" });
    create.mockRejectedValueOnce(new Error("rate limited"));
    expect(await generateReply("I can't do this", history)).toEqual({ reply: "", mood: "sad", risk: "crisis" });
  });
});

describe("What helps you", () => {
  const systemMessage = () => create.mock.calls[0][0].messages[0].content as string;

  it("tells the model what the person chose", async () => {
    modelSays({ reply: "That's a heavy day. I'm here." });
    await generateReply("rough day", [], { care: { hugs: "no", approach: "listen", tone: "either" } });
    expect(systemMessage()).toContain("Never offer hugs");
    expect(systemMessage()).toContain("mostly want to be listened to");
    expect(systemMessage()).toContain("rule 12 always comes first");
    expect(systemMessage()).not.toContain("prefer you to be direct");
  });

  it("adds nothing when everything is left to Bubble", () => {
    expect(careInstructions({ hugs: "either", approach: "either", tone: "either" })).toBe("");
    expect(careInstructions(undefined)).toBe("");
  });
});
