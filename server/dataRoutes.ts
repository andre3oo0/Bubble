import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { journalEntries, moodCheckins, user } from "@shared/schema";
import {
  journalEntryInputSchema,
  journalEntryUpdateSchema,
  moodCheckinInputSchema,
  type JournalEntry,
  type MoodCheckin,
} from "@shared/api";
import type { Mood } from "@shared/chat";
import { db } from "./db";
import { requireUser, type AuthedLocals } from "./auth";

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
