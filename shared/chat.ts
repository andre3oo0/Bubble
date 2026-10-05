import { z } from "zod";

export const moods = ["happy", "calm", "sad", "anxious", "stressed", "neutral", "improved"] as const;
export const moodSchema = z.enum(moods);
export type Mood = z.infer<typeof moodSchema>;

// "crisis" = signs of suicidal thoughts, self-harm or immediate danger
export const riskLevels = ["none", "concern", "crisis"] as const;
export const riskSchema = z.enum(riskLevels);
export type RiskLevel = z.infer<typeof riskSchema>;

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

// The client sends the conversation it's showing: the server only keeps the last
// few turns, and nothing at all after an hour or a restart
export const reflectRequestSchema = z.object({
  transcript: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(60),
});
export type ReflectRequest = z.infer<typeof reflectRequestSchema>;

export const endChatSchema = z.object({ sessionId: z.string().uuid() });

export interface ReflectionResponse {
  title: string;
  summary: string;
  takeaway: string;
  // when anything in the conversation suggested crisis
  helplines?: Helpline[];
  // true when the AI was unavailable or the daily limit was reached
  fallback?: boolean;
}

export interface Helpline {
  name: string;
  phone: string;
  hours: string;
}

export interface ChatResponse {
  reply: string;
  // the mood the user expressed, not Bubble's tone
  mood: Mood;
  risk: RiskLevel;
  sessionId: string;
  helplines?: Helpline[];
  // true when the AI was unavailable and a canned reply was used
  fallback?: boolean;
  // true when today's message limit was reached and the AI wasn't called
  limited?: boolean;
}
