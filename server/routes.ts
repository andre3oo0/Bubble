import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { auth, googleSignInEnabled, pruneExpiredAuthRows } from "./auth";
import { registerDataRoutes } from "./dataRoutes";
import { describeError } from "./log";
import { allowAiCall, pruneOldUsage, usageKey } from "./usage";
import { DEVICE_HEADER } from "@shared/device";
import { generateReflection, generateReply, type AiReflection, type AiReply, type ChatTurn } from "./openaiService";
import {
  chatRequestSchema,
  endChatSchema,
  reflectRequestSchema,
  type ChatResponse,
  type Mood,
  type ReflectionResponse,
  type RiskLevel,
} from "@shared/chat";
import { CRISIS_REPLY, HELPLINES, detectCrisis } from "@shared/safety";

// Conversation kept per session for context (user + assistant messages). More turns
// let Bubble remember what was said earlier; the character budget keeps one long
// chat from costing too much
const MAX_HISTORY_LENGTH = 24;
const MAX_HISTORY_CHARS = 8000;

// Sessions live in memory until the database is wired up; drop idle ones
const SESSION_TTL_MS = 60 * 60 * 1000;

interface ChatSession {
  history: ChatTurn[];
  lastActive: number;
}

const sessions = new Map<string, ChatSession>();

function getSession(sessionId: string): ChatSession {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { history: [], lastActive: Date.now() };
    sessions.set(sessionId, session);
  }
  session.lastActive = Date.now();
  return session;
}

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  sessions.forEach((session, id) => {
    if (session.lastActive < cutoff) sessions.delete(id);
  });
}, 10 * 60 * 1000).unref();

setInterval(() => {
  pruneOldUsage().catch((error) => console.error('Usage prune failed:', describeError(error)));
  pruneExpiredAuthRows().catch((error) => console.error('Session prune failed:', describeError(error)));
}, 60 * 60 * 1000).unref();

const LIMIT_REPLY =
  "We've reached today's limit for chatting, so I can't reply properly until tomorrow. " +
  "You can still write in your journal or try a breathing exercise, and Get help is always there if you need someone right now.";
const GUEST_LIMIT_REPLY =
  LIMIT_REPLY + " Creating a free account gives you more messages each day.";
// The whole app is over its daily AI budget, so an account wouldn't help
const APP_LIMIT_REPLY =
  "I've had so many conversations today that I can't reply properly until tomorrow. " +
  "You can still write in your journal or try a breathing exercise, and Get help is always there if you need someone right now.";

// Stops scripts and accidental floods; the daily cap below handles cost
const chatBurstLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.CHAT_PER_MINUTE_LIMIT) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "You're sending messages very quickly. Take a breath and try again in a minute." },
});

// Canned replies used when the AI is unavailable. They can't know what was said, so
// they stay gentle and open, never assume, and never sound like a form: someone may
// have just shared something heavy.
const moodResponses = {
  happy: [
    "I love hearing that. Tell me more, I'm all ears.",
    "That's really lovely. I'm happy with you.",
  ],
  calm: [
    "That sounds like a nice place to be. I'm glad you're here.",
    "I'm glad things feel a bit settled. Stay as long as you like.",
  ],
  sad: [
    "I'm so sorry you're going through this. I'm here, and you don't have to carry it alone.",
    "That's a lot to hold. Take your time, I'm right here with you.",
  ],
  anxious: [
    "That's such an uncomfortable feeling, and it makes sense. I'm here with you. Breathing slowly together might help a little, whenever you're ready.",
    "You're not alone with this. Go as slowly as you need, I'm listening.",
  ],
  stressed: [
    "That's a lot on your plate. You don't have to sort it all out at once. I'm here.",
    "It's okay to feel stretched thin. Let's take it one small piece at a time, together.",
  ],
  neutral: [
    "I'm here, and I'm listening. Share as much or as little as you like.",
    "Thank you for telling me. Take your time, I'm right here.",
  ],
  improved: [
    "I'm really glad things feel a bit lighter. You've earned that.",
    "That's so good to hear. Little steps like that really count.",
  ],
};

// Used for the reflection when the AI is down or the daily limit is reached
const FALLBACK_REFLECTION: Omit<ReflectionResponse, 'helplines'> = {
  title: 'Talking it through',
  summary: "You took some time to talk through what's on your mind. That's worth doing, even when it's hard.",
  takeaway: "What's one thing from this chat you'd like to remember?",
  fallback: true,
};

// Roughly a few thousand tokens: plenty for a reflection, and keeps the cost down
const MAX_REFLECTION_CHARS = 12000;

function recentTurns(transcript: ChatTurn[], maxChars = MAX_REFLECTION_CHARS): ChatTurn[] {
  const kept: ChatTurn[] = [];
  let total = 0;
  for (let i = transcript.length - 1; i >= 0; i--) {
    total += transcript[i].content.length;
    if (total > maxChars && kept.length > 0) break;
    kept.unshift(transcript[i]);
  }
  return kept;
}

function getRandomMoodResponse(mood: Mood): string {
  const responses = moodResponses[mood] || moodResponses.neutral;
  return responses[Math.floor(Math.random() * responses.length)];
}

// Keyword fallback for the user's message when the AI can't classify it
function analyzeMood(message: string): Mood {
  const message_lower = message.toLowerCase();

  // Loss first, so "my gran passed away" never gets a cheerful reply
  if (/\b(passed away|died|dead|death|funeral|grief|grieving|lost my)\b/.test(message_lower)) {
    return 'sad';
  } else if (message_lower.includes('happy') || message_lower.includes('joy') || message_lower.includes('excited')) {
    return 'happy';
  } else if (message_lower.includes('calm') || message_lower.includes('peaceful') || message_lower.includes('relaxed')) {
    return 'calm';
  } else if (message_lower.includes('sad') || message_lower.includes('depressed') || message_lower.includes('unhappy')) {
    return 'sad';
  } else if (message_lower.includes('anxious') || message_lower.includes('worried') || message_lower.includes('nervous')) {
    return 'anxious';
  } else if (message_lower.includes('stress') || message_lower.includes('overwhelm') || message_lower.includes('pressure')) {
    return 'stressed';
  } else if (message_lower.includes('better') || message_lower.includes('improv') || message_lower.includes('progress')) {
    return 'improved';
  }

  return 'neutral';
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // REST API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Which sign-in options to show
  app.get('/api/auth-options', (_req, res) => {
    res.json({ google: googleSignInEnabled });
  });

  app.post('/api/chat', chatBurstLimit, async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Message is required (max 2000 characters)' });
    }

    const { message } = parsed.data;
    const sessionId = parsed.data.sessionId ?? randomUUID();
    const session = getSession(sessionId);

    // Daily cap on AI calls. Crisis messages always get helplines, even over the cap,
    // and if the counter itself fails we let the message through rather than block support.
    const signedIn = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(() => null);
    const allowed = await allowAiCall(usageKey(signedIn?.user.id, req.ip, req.get(DEVICE_HEADER)));
    if (allowed !== 'ok') {
      const crisis = detectCrisis(message);
      const limitReply = allowed === 'app' ? APP_LIMIT_REPLY : signedIn ? LIMIT_REPLY : GUEST_LIMIT_REPLY;
      const limited: ChatResponse = crisis
        ? { reply: CRISIS_REPLY, mood: analyzeMood(message), risk: 'crisis', sessionId, helplines: HELPLINES, limited: true }
        : { reply: limitReply, mood: analyzeMood(message), risk: 'none', sessionId, limited: true };
      return res.json(limited);
    }

    let ai: AiReply | null = null;
    try {
      ai = await generateReply(message, recentTurns(session.history, MAX_HISTORY_CHARS), {
        name: signedIn?.user.name,
        care: parsed.data.care,
      });
    } catch (error) {
      console.error('Chat AI error:', describeError(error));
    }

    // The keyword check wins even if the model rated the message lower
    const risk: RiskLevel = detectCrisis(message) ? 'crisis' : ai?.risk ?? 'none';
    const mood = ai?.mood ?? analyzeMood(message);
    // No AI reply, or one with no words in it (see hasWords): a canned one instead
    const reply = ai?.reply || (risk === 'crisis' ? CRISIS_REPLY : getRandomMoodResponse(mood));

    session.history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
    if (session.history.length > MAX_HISTORY_LENGTH) {
      session.history.splice(0, session.history.length - MAX_HISTORY_LENGTH);
    }

    const response: ChatResponse = { reply, mood, risk, sessionId };
    if (risk === 'crisis') response.helplines = HELPLINES;
    if (!ai?.reply) response.fallback = true;

    res.json(response);
  });

  // Post-chat debrief: a short reflection on the conversation, for "Reflect" and
  // "Save to journal". Counts towards the daily limit like a chat message.
  app.post('/api/chat/reflect', chatBurstLimit, async (req, res) => {
    const parsed = reflectRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'A conversation is required' });
    }

    const transcript = recentTurns(parsed.data.transcript);
    const crisis = transcript.some((turn) => turn.role === 'user' && detectCrisis(turn.content));
    const withHelplines = (reflection: Omit<ReflectionResponse, 'helplines'>): ReflectionResponse =>
      crisis ? { ...reflection, helplines: HELPLINES } : reflection;

    const signedIn = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) }).catch(() => null);
    if ((await allowAiCall(usageKey(signedIn?.user.id, req.ip, req.get(DEVICE_HEADER)))) !== 'ok') {
      return res.json(withHelplines(FALLBACK_REFLECTION));
    }

    let ai: AiReflection | null = null;
    try {
      ai = await generateReflection(transcript);
    } catch (error) {
      console.error('Reflection AI error:', describeError(error));
    }

    res.json(withHelplines(ai ? { title: ai.title.slice(0, 200), summary: ai.summary, takeaway: ai.takeaway } : FALLBACK_REFLECTION));
  });

  // "Let go": forget the conversation context kept for this chat
  app.post('/api/chat/end', (req, res) => {
    const parsed = endChatSchema.safeParse(req.body);
    if (parsed.success) sessions.delete(parsed.data.sessionId);
    res.status(204).end();
  });

  // Journal and mood check-ins (signed-in users only)
  registerDataRoutes(app);

  return httpServer;
}
