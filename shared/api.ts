import { z } from "zod";
import { moodSchema, type Helpline, type Mood } from "./chat";
import { feelingTagSchema, MAX_TAGS, moodLevelSchema, type FeelingTag, type MoodLevel } from "./checkin";

// Request validation and response shapes shared by client and server

export const journalEntryInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
  mood: moodSchema,
});
export type JournalEntryInput = z.infer<typeof journalEntryInputSchema>;

export const journalEntryUpdateSchema = journalEntryInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Nothing to update",
);

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood;
  createdAt: string;
  updatedAt: string;
}

export const moodCheckinInputSchema = z.object({
  level: moodLevelSchema,
  // Optional; each feeling once
  tags: z
    .array(feelingTagSchema)
    .max(MAX_TAGS)
    .refine((tags) => new Set(tags).size === tags.length, "Each feeling once")
    .default([]),
});
export type MoodCheckinInput = z.input<typeof moodCheckinInputSchema>;

export interface MoodCheckin {
  id: string;
  level: MoodLevel;
  tags: FeelingTag[];
  createdAt: string;
}

// "Reflect with Bubble" on a journal entry. Not stored unless the person adds it.
export interface EntryReflection {
  reflection: string;
  // something to write about next
  question: string;
  helplines?: Helpline[];
  // true when the AI was unavailable or the daily limit was reached
  fallback?: boolean;
}
