import { describe, expect, it } from "vitest";
import { moodForCheckin } from "./checkin";

describe("moodForCheckin", () => {
  it("follows the level when no feelings are picked", () => {
    expect([1, 2, 3, 4, 5].map((level) => moodForCheckin(level as 1 | 2 | 3 | 4 | 5))).toEqual([
      "sad",
      "sad",
      "neutral",
      "calm",
      "happy",
    ]);
  });

  it("lets a picked feeling say more than the level", () => {
    expect(moodForCheckin(4, ["anxious"])).toBe("anxious");
    expect(moodForCheckin(2, ["overwhelmed"])).toBe("stressed");
    expect(moodForCheckin(2, ["angry"])).toBe("stressed");
    expect(moodForCheckin(3, ["lonely"])).toBe("sad");
    expect(moodForCheckin(4, ["hopeful"])).toBe("improved");
  });

  it("puts the more pressing feeling first", () => {
    expect(moodForCheckin(5, ["happy", "anxious"])).toBe("anxious");
    expect(moodForCheckin(3, ["calm", "sad"])).toBe("sad");
  });

  it("falls back to the level for feelings without a face", () => {
    expect(moodForCheckin(2, ["tired"])).toBe("sad");
    expect(moodForCheckin(5, ["tired"])).toBe("happy");
  });
});
