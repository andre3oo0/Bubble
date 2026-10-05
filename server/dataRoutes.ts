import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { journalEntries, moodCheckins, user } from "@shared/schema";
import {
  journalEntryInputSchema,
  journalEntryUpdateSchema,
  moodCheckinInputSchema,
  type EntryReflection,
  type JournalEntry,
  type MoodCheckin,
} from "@shared/api";
import type { Mood } from "@shared/chat";
import { HELPLINES, detectCrisis } from "@shared/safety";
import { db } from "./db";
import { requireUser, type AuthedLocals } from "./auth";
import { generateEntryReflection } from "./openaiService";
import { recordChatMessage, usageKey } from "./usage";

type AuthedHandler = (req: Request, res: Response<unknown, AuthedLocals>) => Promise<unknown>;

// Express 4 doesn't catch rejected promises, so pass them on to the error handler
const handle =
  (fn: AuthedHandler): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res as Response<unknown, AuthedLocals>).catch(next);
  };

const idSchema = z.string().uuid();
const MAX_JOURNAL_ENTRIES = 200;
const DEFAULT_MOOD_DAYS = 30;

// Long entries are trimmed before they go to the AI to keep the cost down
const MAX_REFLECT_CHARS = 8000;

const FALLBACK_ENTRY_REFLECTION: Omit<EntryReflection, "helplines"> = {
  reflection: "Thank you for writing this down. Putting things into words is a real step, even on the days it doesn't feel like much.",
  question: "Reading it back now, what stands out to you most?",
  fallback: true,
};

const reflectBurstLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.CHAT_PER_MINUTE_LIMIT) || 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "That's a lot of reflections at once. Try again in a minute." },
});

function toJournalEntry(row: typeof journalEntries.$inferSelect): JournalEntry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    mood: row.mood as Mood,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMoodCheckin(row: typeof moodCheckins.$inferSelect): MoodCheckin {
  return { id: row.id, mood: row.mood as Mood, createdAt: row.createdAt.toISOString() };
}

export function registerDataRoutes(app: Express) {
  app.use(["/api/journal", "/api/moods", "/api/me"], requireUser);

  // Everything we hold about the signed-in user, as a JSON download (POPIA access request).
  // Chat isn't stored, so there's nothing to export for it.
  app.get("/api/me/export", handle(async (_req, res) => {
    const userId = res.locals.userId;
    const [account] = await db
      .select({ name: user.name, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, userId));
    const journal = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.createdAt));
    const moods = await db
      .select()
      .from(moodCheckins)
      .where(eq(moodCheckins.userId, userId))
      .orderBy(desc(moodCheckins.createdAt));

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="bubble-data-${date}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      account: { ...account, createdAt: account.createdAt.toISOString() },
      journalEntries: journal.map(toJournalEntry),
      moodCheckins: moods.map(toMoodCheckin),
      chat: "Bubble doesn't store your chat messages.",
    });
  }));

  app.get("/api/journal", handle(async (_req, res) => {
    const rows = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, res.locals.userId))
      .orderBy(desc(journalEntries.createdAt))
      .limit(MAX_JOURNAL_ENTRIES);
    res.json(rows.map(toJournalEntry));
  }));

  app.post("/api/journal", handle(async (req, res) => {
    const parsed = journalEntryInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Title, text and mood are required" });

    const [row] = await db
      .insert(journalEntries)
      .values({ ...parsed.data, userId: res.locals.userId })
      .returning();
    res.status(201).json(toJournalEntry(row));
  }));

  app.patch("/api/journal/:id", handle(async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(404).json({ error: "Entry not found" });
    const parsed = journalEntryUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid entry" });

    const [row] = await db
      .update(journalEntries)
      .set(parsed.data)
      .where(and(eq(journalEntries.id, id.data), eq(journalEntries.userId, res.locals.userId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Entry not found" });
    res.json(toJournalEntry(row));
  }));

  app.delete("/api/journal/:id", handle(async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(404).json({ error: "Entry not found" });

    const deleted = await db
      .delete(journalEntries)
      .where(and(eq(journalEntries.id, id.data), eq(journalEntries.userId, res.locals.userId)))
      .returning({ id: journalEntries.id });
    if (deleted.length === 0) return res.status(404).json({ error: "Entry not found" });
    res.status(204).end();
  }));

  // "Reflect with Bubble": only ever on one of your own entries, and only when asked.
  // Counts towards the daily chat limit; crisis words always bring the helplines.
  app.post("/api/journal/:id/reflect", reflectBurstLimit, handle(async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(404).json({ error: "Entry not found" });

    const [row] = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id.data), eq(journalEntries.userId, res.locals.userId)));
    if (!row) return res.status(404).json({ error: "Entry not found" });

    const crisis = detectCrisis(`${row.title}\n${row.content}`);
    const withHelplines = (reflection: Omit<EntryReflection, "helplines">): EntryReflection =>
      crisis ? { ...reflection, helplines: HELPLINES } : reflection;

    const { key, limit } = usageKey(res.locals.userId, req.ip);
    let used = 0;
    try {
      used = await recordChatMessage(key);
    } catch (error) {
      console.error("Chat usage count failed:", error instanceof Error ? error.message : error);
    }
    if (used > limit) return res.json(withHelplines(FALLBACK_ENTRY_REFLECTION));

    try {
      const ai = await generateEntryReflection({
        title: row.title,
        content: row.content.slice(0, MAX_REFLECT_CHARS),
        mood: row.mood as Mood,
      });
      res.json(withHelplines({ reflection: ai.reflection, question: ai.question }));
    } catch (error) {
      console.error("Entry reflection AI error:", error instanceof Error ? error.message : error);
      res.json(withHelplines(FALLBACK_ENTRY_REFLECTION));
    }
  }));

  app.get("/api/moods", handle(async (req, res) => {
    const days = z.coerce.number().int().min(1).max(365).catch(DEFAULT_MOOD_DAYS).parse(req.query.days);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(moodCheckins)
      .where(and(eq(moodCheckins.userId, res.locals.userId), gte(moodCheckins.createdAt, since)))
      .orderBy(desc(moodCheckins.createdAt));
    res.json(rows.map(toMoodCheckin));
  }));

  app.post("/api/moods", handle(async (req, res) => {
    const parsed = moodCheckinInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "A valid mood is required" });

    const [row] = await db
      .insert(moodCheckins)
      .values({ mood: parsed.data.mood, userId: res.locals.userId })
      .returning();
    res.status(201).json(toMoodCheckin(row));
  }));
}
