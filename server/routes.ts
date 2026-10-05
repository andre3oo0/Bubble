import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import { registerDataRoutes } from "./dataRoutes";
import { pruneOldUsage, recordChatMessage, usageKey } from "./usage";
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
  pruneOldUsage().catch((error) => console.error('Usage prune failed:', error));
}, 60 * 60 * 1000).unref();

const LIMIT_REPLY =
  "We've reached today's limit for chatting, so I can't reply properly until tomorrow. " +
  "You can still write in your journal or try a breathing exercise, and SOS is always there if you need someone right now.";
const GUEST_LIMIT_REPLY =
  LIMIT_REPLY + " Creating a free account gives you more messages each day.";

// Stops scripts and accidental floods; the daily cap below handles cost
const chatBurstLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.CHAT_PER_MINUTE_LIMIT) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: "You're sending messages very quickly. Take a breath and try again in a minute." },
});

// Canned replies used when the AI is unavailable
const moodResponses = {
  happy: [
    "I'm glad to hear you're feeling positive! What's bringing you joy today?",
    "That's wonderful! It's great to see you in such high spirits."
  ],
  calm: [
    "It sounds like you're in a peaceful state of mind. How can we maintain this tranquility?",
    "I'm here to support your calm energy. What would you like to explore today?"
  ],
  sad: [
    "I'm sorry to hear you're feeling down. Would you like to talk about what's troubling you?",
    "It's okay to feel sad sometimes. I'm here to listen whenever you're ready to share."
  ],
  anxious: [
    "I notice you might be feeling anxious. Would taking a few deep breaths together help?",
    "Anxiety can be challenging. Let's work through these feelings together at your pace."
  ],
  stressed: [
    "It sounds like you're under a lot of pressure. What's contributing to your stress right now?",
    "When you're feeling stressed, it can help to identify what's within your control. Shall we explore that?"
  ],
  neutral: [
    "How are you feeling right now? I'm here to support you however you need.",
    "Is there something specific you'd like to talk about today?"
  ],
  improved: [
    "It's great to hear you're feeling better! What positive changes have you noticed?",
    "Progress is something to celebrate! What's been working well for you?"
  ]
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

  if (message_lower.includes('happy') || message_lower.includes('joy') || message_lower.includes('excited')) {
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
    const { key, limit } = usageKey(signedIn?.user.id, req.ip);
    let used = 0;
    try {
      used = await recordChatMessage(key);
    } catch (error) {
      console.error('Chat usage count failed:', error instanceof Error ? error.message : error);
    }
    if (used > limit) {
      const crisis = detectCrisis(message);
      const limited: ChatResponse = crisis
        ? { reply: CRISIS_REPLY, mood: analyzeMood(message), risk: 'crisis', sessionId, helplines: HELPLINES, limited: true }
        : { reply: signedIn ? LIMIT_REPLY : GUEST_LIMIT_REPLY, mood: analyzeMood(message), risk: 'none', sessionId, limited: true };
      return res.json(limited);
    }

    let ai: AiReply | null = null;
    try {
      ai = await generateReply(message, recentTurns(session.history, MAX_HISTORY_CHARS), {
        name: signedIn?.user.name,
      });
    } catch (error) {
      console.error('Chat AI error:', error instanceof Error ? error.message : error);
    }

    // The keyword check wins even if the model rated the message lower
    const risk: RiskLevel = detectCrisis(message) ? 'crisis' : ai?.risk ?? 'none';
    const mood = ai?.mood ?? analyzeMood(message);
    const reply = ai?.reply ?? (risk === 'crisis' ? CRISIS_REPLY : getRandomMoodResponse(mood));

    session.history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
    if (session.history.length > MAX_HISTORY_LENGTH) {
      session.history.splice(0, session.history.length - MAX_HISTORY_LENGTH);
    }

    const response: ChatResponse = { reply, mood, risk, sessionId };
    if (risk === 'crisis') response.helplines = HELPLINES;
    if (!ai) response.fallback = true;

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
    const { key, limit } = usageKey(signedIn?.user.id, req.ip);
    let used = 0;
    try {
      used = await recordChatMessage(key);
    } catch (error) {
      console.error('Chat usage count failed:', error instanceof Error ? error.message : error);
    }
    if (used > limit) {
      return res.json(withHelplines(FALLBACK_REFLECTION));
    }

    let ai: AiReflection | null = null;
    try {
      ai = await generateReflection(transcript);
    } catch (error) {
      console.error('Reflection AI error:', error instanceof Error ? error.message : error);
    }

    res.json(withHelplines(ai ? { title: ai.title.slice(0, 200), summary: ai.summary, takeaway: ai.takeaway } : FALLBACK_REFLECTION));
  });

  // "Let go": forget the conversation context kept for this chat
  app.post('/api/chat/end', (req, res) => {
    const parsed = endChatSchema.safeParse(req.body);
    if (parsed.success) sessions.delete(parsed.data.sessionId);
    res.status(204).end();
  });

  // Environment change API (with ambient sound selection)
  app.post('/api/environment/change', async (req, res) => {
    try {
      const { environmentId } = req.body;
      
      // This would normally update user preferences in the database
      // and potentially notify connected clients about the change
      
      // Return environment details including ambient sound URL
      const environments = {
        forest: {
          id: 'forest',
          name: 'Forest Retreat',
          audioUrl: '/sounds/forest-ambient.mp3',
          sceneData: { 
            particles: 'leaves',
            lightIntensity: 0.8,
            fogDensity: 0.05
          }
        },
        ocean: {
          id: 'ocean',
          name: 'Ocean Waves',
          audioUrl: '/sounds/ocean-waves.mp3',
          sceneData: { 
            particles: 'bubbles',
            lightIntensity: 1.0,
            fogDensity: 0.02
          }
        },
        sunset: {
          id: 'sunset',
          name: 'Peaceful Sunset',
          audioUrl: '/sounds/gentle-wind.mp3',
          sceneData: { 
            particles: 'dust',
            lightIntensity: 0.7,
            fogDensity: 0.08
          }
        },
        bedroom: {
          id: 'bedroom',
          name: 'Cozy Bedroom',
          audioUrl: '/sounds/fireplace.mp3',
          sceneData: { 
            particles: 'none',
            lightIntensity: 0.6,
            fogDensity: 0.01
          }
        }
      };
      
      res.json(environments[environmentId as keyof typeof environments] || environments.forest);
    } catch (error) {
      res.status(500).json({ error: 'Failed to change environment' });
    }
  });

  // Safe Space routes
  app.get('/api/safe-space/affirmation', async (req, res) => {
    try {
      // Simulated affirmation
      const affirmations = [
        "You are doing your best, and that is enough.",
        "You are worthy of love and support.",
        "Your feelings are valid and important.",
        "Each breath is a fresh start.",
        "You have the strength to overcome challenges."
      ];
      
      const randomIndex = Math.floor(Math.random() * affirmations.length);
      
      res.json({ affirmation: affirmations[randomIndex] });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch affirmation' });
    }
  });

  // Journal and mood check-ins (signed-in users only)
  registerDataRoutes(app);

  return httpServer;
}
