import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { account as accountTable, journalEntries, moodCheckins, session, user } from "@shared/schema";
import {
  journalEntryInputSchema,
  journalEntryUpdateSchema,
  moodCheckinInputSchema,
  type EntryReflection,
  type JournalEntry,
  type MoodCheckin,
} from "@shared/api";
import type { Mood } from "@shared/chat";
import { feelingTags, type FeelingTag, type MoodLevel } from "@shared/checkin";
import { HELPLINES, detectCrisis } from "@shared/safety";
import { LEGAL_VERSION } from "@shared/legal";
import { db } from "./db";
import { requireUser, type AuthedLocals } from "./auth";
import { generateEntryReflection } from "./openaiService";
import { describeError } from "./log";
import { allowAiCall, usageKey } from "./usage";

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

// Caps per person, so one account can't fill the (free, small) database for everyone.
// Far above what anyone writes by hand.
const MAX_STORED_ENTRIES = 2000;
const MAX_MOODS_PER_DAY = 50;

// Long entries are trimmed before they go to the AI to keep the cost down
const MAX_REFLECT_CHARS = 8000;

const FALLBACK_ENTRY_REFLECTION: Omit<EntryReflection, "helplines"> = {
  reflection: "Thank you for writing this down. Putting things into words is a real step, even on the days it doesn't feel like much.",
  question: "Reading it back now, what stands out to you most?",
  fallback: true,
};

// Saving and editing entries, per person
const journalWriteLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (_req, res) => res.locals.userId,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "That's a lot of saving at once. Please wait a minute and try again." },
});

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
  return {
    id: row.id,
    level: row.level as MoodLevel,
    tags: row.tags.filter(isFeelingTag),
    createdAt: row.createdAt.toISOString(),
  };
}

export function registerDataRoutes(app: Express) {
  app.use(["/api/journal", "/api/moods", "/api/me"], requireUser);

  // Everything we hold about the signed-in user, as a JSON download (POPIA access request).
  // Chat isn't stored, so there's nothing to export for it.
  app.get("/api/me/export", handle(async (_req, res) => {
    const userId = res.locals.userId;
    const [account] = await db
      .select({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        termsVersion: user.termsVersion,
        termsAcceptedAt: user.termsAcceptedAt,
      })
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
    // Never the tokens or password hash: only what was signed in, how, and when
    const signIns = await db
      .select({ createdAt: session.createdAt, expiresAt: session.expiresAt })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.createdAt));
    const methods = await db
      .select({ providerId: accountTable.providerId, createdAt: accountTable.createdAt })
      .from(accountTable)
      .where(eq(accountTable.userId, userId));

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="bubble-data-${date}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      account: {
        name: account.name,
        email: account.email,
        emailVerified: account.emailVerified,
        createdAt: account.createdAt.toISOString(),
      },
      agreedTo: account.termsVersion
        ? { termsAndPrivacyVersion: account.termsVersion, at: account.termsAcceptedAt?.toISOString() ?? null }
        : null,
      journalEntries: journal.map(toJournalEntry),
      moodCheckins: moods.map(toMoodCheckin),
      signInMethods: methods.map((m) => ({
        method: m.providerId === "credential" ? "email" : m.providerId,
        addedAt: m.createdAt.toISOString(),
      })),
      sessions: signIns.map((s) => ({ startedAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString() })),
      chat: "Bubble doesn't store your chat messages.",
    });
  }));

  // Agreeing to the current terms and privacy policy (Google sign-ups, older
  // accounts, and everyone again after a change). Only the current version counts.
  app.post("/api/me/consent", handle(async (req, res) => {
    const parsed = z.object({ version: z.literal(LEGAL_VERSION) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Please agree to the current version" });
    await db
      .update(user)
      .set({ termsVersion: LEGAL_VERSION, termsAcceptedAt: new Date() })
      .where(eq(user.id, res.locals.userId));
    res.status(204).end();
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

  app.post("/api/journal", journalWriteLimit, handle(async (req, res) => {
    const parsed = journalEntryInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Title, text and mood are required" });

    const [stored] = await db
      .select({ total: count() })
      .from(journalEntries)
      .where(eq(journalEntries.userId, res.locals.userId));
    if (stored.total >= MAX_STORED_ENTRIES) {
      return res.status(429).json({
        error: `Your journal has reached ${MAX_STORED_ENTRIES.toLocaleString("en-ZA")} entries. Delete some older ones to make room.`,
      });
    }

    const [row] = await db
      .insert(journalEntries)
      .values({ ...parsed.data, userId: res.locals.userId })
      .returning();
    res.status(201).json(toJournalEntry(row));
  }));

  app.patch("/api/journal/:id", journalWriteLimit, handle(async (req, res) => {
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

    if ((await allowAiCall(usageKey(res.locals.userId, req.ip))) !== "ok") return res.json(withHelplines(FALLBACK_ENTRY_REFLECTION));

    try {
      const ai = await generateEntryReflection({
        title: row.title,
        content: row.content.slice(0, MAX_REFLECT_CHARS),
        mood: row.mood as Mood,
      });
      res.json(withHelplines({ reflection: ai.reflection, question: ai.question }));
    } catch (error) {
      console.error("Entry reflection AI error:", describeError(error));
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
    if (!parsed.success) return res.status(400).json({ error: "A level from 1 to 5 is required, with up to 5 different feelings" });

    const [today] = await db
      .select({ total: count() })
      .from(moodCheckins)
      .where(and(eq(moodCheckins.userId, res.locals.userId), gte(moodCheckins.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
    if (today.total >= MAX_MOODS_PER_DAY) {
      return res.status(429).json({ error: "That's a lot of check-ins for one day. Try again tomorrow." });
    }

    const [row] = await db
      .insert(moodCheckins)
      .values({ level: parsed.data.level, tags: parsed.data.tags, userId: res.locals.userId })
      .returning();
    res.status(201).json(toMoodCheckin(row));
  }));
}

function isFeelingTag(tag: string): tag is FeelingTag {
  return (feelingTags as readonly string[]).includes(tag);
}
