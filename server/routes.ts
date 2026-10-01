import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { registerDataRoutes } from "./dataRoutes";
import { generateReply, type AiReply, type ChatTurn } from "./openaiService";
import { chatRequestSchema, type ChatResponse, type Mood, type RiskLevel } from "@shared/chat";
import { CRISIS_REPLY, HELPLINES, detectCrisis } from "@shared/safety";

// Max conversation turns kept per session (user + assistant messages)
const MAX_HISTORY_LENGTH = 10;

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

  app.post('/api/chat', async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Message is required (max 2000 characters)' });
    }

    const { message } = parsed.data;
    const sessionId = parsed.data.sessionId ?? randomUUID();
    const session = getSession(sessionId);

    let ai: AiReply | null = null;
    try {
      ai = await generateReply(message, [...session.history]);
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
