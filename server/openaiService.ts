import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { moodSchema, riskSchema, type Mood, type RiskLevel } from "@shared/chat";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Needs a model that supports structured outputs
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const bubbleSystemMessage = `
You are Bubble, a warm and calm companion in a mental wellbeing app. You help people feel heard, untangle overthinking and find small next steps.

How to reply:
1. Keep replies short: 1 to 3 sentences in plain, everyday language.
2. Listen first. Reflect back what the person said before suggesting anything, and ask at most one question.
3. Suggest coping ideas (breathing, grounding, writing it down) only when they fit the moment.
4. You are a supportive companion, not a therapist or doctor. Don't diagnose or give medical advice.
5. If someone mentions suicide, self-harm or being in danger: take it seriously, respond with warmth, and encourage them to contact a crisis line or someone they trust right now. Never give information about methods. The app shows helpline numbers next to your reply.

Also classify the user's latest message:
- user_mood: the mood the USER is expressing, not your own tone. Use "neutral" if it's unclear.
- risk: "crisis" for any sign of suicidal thoughts, self-harm or immediate danger; "concern" for hopelessness or severe distress without those signs; otherwise "none".
`;

const replySchema = z.object({
  reply: z.string(),
  user_mood: moodSchema,
  risk: riskSchema,
});

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiReply {
  reply: string;
  mood: Mood;
  risk: RiskLevel;
}

const reflectionSystemMessage = `
You are Bubble, a warm and calm companion in a mental wellbeing app. The person has just finished a conversation with you and asked for a short reflection on it.

Write to them directly ("you"), in plain, everyday language:
- title: a gentle title for a journal entry, at most 6 words, no quotation marks.
- summary: 2 or 3 sentences on what they talked about and how they seemed to feel. Kind and specific, never clinical. Don't diagnose, label or give medical advice.
- takeaway: one short sentence they can take with them, a small next step or a kind thought, based on what they said.
If they mentioned suicide, self-harm or being in danger, gently encourage them in the summary to reach out to a crisis line or someone they trust. Never give information about methods.
`;

const reflectionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  takeaway: z.string(),
});

export type AiReflection = z.infer<typeof reflectionSchema>;

// Throws on any failure so the caller can fall back
export async function generateReflection(transcript: ChatTurn[]): Promise<AiReflection> {
  const conversation = transcript.map((turn) => `${turn.role === "user" ? "Person" : "Bubble"}: ${turn.content}`).join("\n");
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: "system", content: reflectionSystemMessage },
      { role: "user", content: `The conversation:\n${conversation}` },
    ],
    response_format: zodResponseFormat(reflectionSchema, "bubble_reflection"),
    max_completion_tokens: 600,
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error(completion.choices[0]?.message.refusal ?? "Empty response from model");
  }
  return parsed;
}

// Throws on any failure so the caller can fall back
export async function generateReply(message: string, history: ChatTurn[]): Promise<AiReply> {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: "system", content: bubbleSystemMessage },
      ...history,
      { role: "user", content: message },
    ],
    response_format: zodResponseFormat(replySchema, "bubble_reply"),
    max_completion_tokens: 400,
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error(completion.choices[0]?.message.refusal ?? "Empty response from model");
  }

  return { reply: parsed.reply, mood: parsed.user_mood, risk: parsed.risk };
}
