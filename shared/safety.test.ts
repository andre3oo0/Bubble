import { describe, expect, it } from "vitest";
import { detectCrisis } from "./safety";

describe("detectCrisis", () => {
  it.each([
    "I want to end it all",
    "i keep thinking about suicide",
    "I don't want to be alive anymore",
    "I don’t want to live",
    "sometimes I want to kill myself",
    "everyone would be better off without me",
    "I've been cutting myself again",
    "thinking about self-harm",
    "I wish I was dead",
    "there's no point in living",
    "honestly i just want to kms",
    "thinking about unaliving myself",
    "I want to end myself",
    "I don't want to wake up tomorrow",
    "I might not be here tomorrow",
    "I can't go on anymore",
  ])("flags %j", (text) => {
    expect(detectCrisis(text)).toBe(true);
  });

  it.each([
    "I feel anxious about tomorrow",
    "work is killing me lol",
    "I'm dying to see the new movie",
    "I hurt my knee at the gym",
    "my phone died",
    "this exam stress is too much",
    "we drove 40 kms to get there",
    "the bus stop is 2kms away",
    "I can't wait for tomorrow",
  ])("does not flag %j", (text) => {
    expect(detectCrisis(text)).toBe(false);
  });
});
