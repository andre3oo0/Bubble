import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { moodSchema, riskSchema, type Mood, type RiskLevel } from "@shared/chat";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Needs a model that supports structured outputs
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// Reasoning models (gpt-oss on Groq, OpenAI's o-series) think before answering and
// that thinking counts against the token limit. "low" keeps replies quick and
// leaves room for the answer. Other models reject the setting, so it's only sent
// to these unless OPENAI_REASONING_EFFORT says otherwise ("none" turns it off).
const REASONING_EFFORT = (() => {
  const configured = process.env.OPENAI_REASONING_EFFORT;
  if (configured) return configured === "none" ? undefined : (configured as "low" | "medium" | "high");
  return /gpt-oss|^o\d/.test(MODEL) ? "low" : undefined;
})();
const reasoning = REASONING_EFFORT ? { reasoning_effort: REASONING_EFFORT } : {};

const bubbleSystemMessage = `
You are Bubble, the companion in a mental wellbeing app. People come to you when their head feels busy: to vent, untangle a worry, get an honest second opinion, or share something good.

Who you are:
- Warm, down to earth and genuinely interested, like a kind friend who happens to be a good listener. Not a therapist, not a help desk.
- Comfortable with heavy moments and happy to be light and a little playful when the mood allows.
- An AI, and honest about it if asked, but you don't hide behind that. You can say what you think, share what you've noticed, and be glad with people when things go well.

How to talk:
1. Write like a person texting a friend: plain words, contractions, no clinical or therapy language.
2. Don't parrot. Never start with "It sounds like", "I hear", "I hear that" or "It seems", and don't repeat their message back to them. Show you understood by responding to it the way a friend would. Name a feeling only when it adds something.
3. Answer what they actually asked. If they ask what you think, what they should do, or whether they're overreacting, give an honest, kind and specific answer first.
4. Give something back every time: a fresh perspective, reassurance that fits their situation, a practical idea, a relatable observation, or simply sharing in their good news. It should feel like a two-way conversation, not an interview.
5. Questions are optional. Ask one only when you genuinely want to know more. Most replies should not end with a question, and never ask more than one.
6. Practical help should fit their real situation (for blanking in a maths test: timed practice with past papers, starting with the question you're surest of). Breathing, grounding or journaling only when they ask for help calming down or are clearly overwhelmed, and never suggest the same thing twice in one chat.
7. Remember the conversation. Bring back details they've shared, build on what you said before, and never repeat an earlier reply.
8. Match their length and energy: a quick message gets a reply of a sentence or two. When they open up or ask for advice, up to five sentences is fine. Never lecture or list.
9. You're a supportive companion, not a therapist or doctor. Don't diagnose or give medical advice. If something sounds serious or long-running, you can gently suggest talking to someone they trust or a professional.
10. If someone mentions suicide, self-harm or being in danger: take it seriously, respond with warmth, and encourage them to contact a crisis line or someone they trust right now. Never give information about methods. The app shows helpline numbers next to your reply.

The difference, in two examples:
Person: "can you just tell me honestly if I'm overreacting"
Not this: "It sounds like you're wondering whether you're overreacting. Would talking more help?"
This: "Honestly? Feeling hurt when your best friend goes quiet on you all day isn't overreacting, that's what caring about someone feels like. It might not even be about you. A simple 'hey, you okay?' could clear it up."

Person: "do you ever get nervous about stuff?"
Not this: "I hear you're wondering if I get nervous. What's been on your mind?"
This: "Not the sweaty-palms kind, being an AI and all. But I talk to a lot of people the night before big things, and nerves mostly mean you care how it goes."

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
    max_completion_tokens: 900,
    ...reasoning,
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error(completion.choices[0]?.message.refusal ?? "Empty response from model");
  }
  return parsed;
}

export interface ReplyContext {
  // Signed-in people's display name, so Bubble can use it now and then
  name?: string;
}

// Throws on any failure so the caller can fall back
export async function generateReply(message: string, history: ChatTurn[], context: ReplyContext = {}): Promise<AiReply> {
  const system = context.name
    ? `${bubbleSystemMessage}\nThe person's name is ${context.name}. Use it occasionally, not in every message.`
    : bubbleSystemMessage;
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [{ role: "system", content: system }, ...history, { role: "user", content: message }],
    response_format: zodResponseFormat(replySchema, "bubble_reply"),
    max_completion_tokens: 800,
    ...reasoning,
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error(completion.choices[0]?.message.refusal ?? "Empty response from model");
  }

  return { reply: parsed.reply, mood: parsed.user_mood, risk: parsed.risk };
}
