import { z } from "zod";
import { moodSchema, type Mood } from "./chat";

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

export const moodCheckinInputSchema = z.object({ mood: moodSchema });

export interface MoodCheckin {
  id: string;
  mood: Mood;
  createdAt: string;
}
