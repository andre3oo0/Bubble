import { z } from "zod";
import type { Mood } from "./chat";

// Mood check-ins: how someone feels on a five-step scale, from 1 (really low) to
// 5 (really good), with optional feeling tags. Chat and the journal keep their own
// mood words; this is only for check-ins.
export const MOOD_LEVELS = [1, 2, 3, 4, 5] as const;
export type MoodLevel = (typeof MOOD_LEVELS)[number];
export const moodLevelSchema = z.number().int().min(1).max(5);

export const feelingTags = [
  "happy",
  "calm",
  "hopeful",
  "tired",
  "anxious",
  "stressed",
  "overwhelmed",
  "sad",
  "lonely",
  "angry",
] as const;
export type FeelingTag = (typeof feelingTags)[number];
export const feelingTagSchema = z.enum(feelingTags);
export const MAX_TAGS = 5;

// Bubble's face follows a check-in. A feeling they picked says more than the level,
// so tags come first, the more pressing ones before the rest.
const TAG_MOODS: [FeelingTag[], Mood][] = [
  [["anxious"], "anxious"],
  [["stressed", "overwhelmed", "angry"], "stressed"],
  [["sad", "lonely"], "sad"],
  [["happy"], "happy"],
  [["calm"], "calm"],
  [["hopeful"], "improved"],
];
const LEVEL_MOODS: Record<MoodLevel, Mood> = { 1: "sad", 2: "sad", 3: "neutral", 4: "calm", 5: "happy" };

export function moodForCheckin(level: MoodLevel, tags: readonly FeelingTag[] = []): Mood {
  const match = TAG_MOODS.find(([group]) => group.some((tag) => tags.includes(tag)));
  return match ? match[1] : LEVEL_MOODS[level];
}

// Check-ins from before the scale were a single mood word. Migration 0004 maps them
// with this table (kept here so the test can check the two agree): the word becomes
// a tag where there's one to match, and the level is the closest step.
export const LEGACY_MOOD_MAPPING: Record<Mood, { level: MoodLevel; tags: FeelingTag[] }> = {
  happy: { level: 5, tags: ["happy"] },
  calm: { level: 4, tags: ["calm"] },
  improved: { level: 4, tags: [] },
  neutral: { level: 3, tags: [] },
  sad: { level: 2, tags: ["sad"] },
  anxious: { level: 2, tags: ["anxious"] },
  stressed: { level: 2, tags: ["stressed"] },
};
