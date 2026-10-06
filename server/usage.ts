import { createHmac } from "crypto";
import { lt, sql } from "drizzle-orm";
import { ipKeyGenerator } from "express-rate-limit";
import { chatUsage } from "@shared/schema";
import { db } from "./db";
import { describeError } from "./log";

// 0 is a valid limit (turns guest chat off), so don't use `|| default`
function envLimit(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isNaN(value) || value < 0 ? fallback : value;
}

// Read at call time so tests (and a restart with new env) can change them
const userLimit = () => envLimit("CHAT_DAILY_LIMIT_USER", 150);
const guestLimit = () => envLimit("CHAT_DAILY_LIMIT_GUEST", 40);
// For the whole app: the AI provider's free quota is shared by everyone, so stop
// just short of it and give the friendly limit message instead of errors
const appAiLimit = () => envLimit("AI_DAILY_LIMIT", 900);
const appEmailLimit = () => envLimit("EMAIL_DAILY_LIMIT", 250);
const EMAILS_PER_ADDRESS = 3;

// Keyed hash so the stored value can't be turned back into an IP or email address
function keyedHash(value: string) {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET || "dev-secret")
    .update(value)
    .digest("hex")
    .slice(0, 32);
}

export function usageKey(userId: string | undefined, ip: string | undefined) {
  if (userId) return { key: `user:${userId}`, limit: userLimit() };
  // One IPv6 connection usually gets a whole /64 or more, so changing the last part
  // of the address would mean a fresh limit. Count the /56 network instead.
  return { key: `ip:${keyedHash(ip ? ipKeyGenerator(ip, 56) : "unknown")}`, limit: guestLimit() };
}

// Adds one to today's count for `key` and returns the new total
export async function countToday(key: string): Promise<number> {
  const [row] = await db
    .insert(chatUsage)
    .values({ key, day: sql`current_date`, count: 1 })
    .onConflictDoUpdate({
      target: [chatUsage.key, chatUsage.day],
      set: { count: sql`${chatUsage.count} + 1` },
    })
    .returning({ count: chatUsage.count });
  return row.count;
}

async function readToday(key: string): Promise<number> {
  const [row] = await db
    .select({ count: chatUsage.count })
    .from(chatUsage)
    .where(sql`${chatUsage.key} = ${key} and ${chatUsage.day} = current_date`);
  return row?.count ?? 0;
}

// One AI call for this person: "personal" when they're over their own daily limit,
// "app" when the whole app is over its daily budget. If counting fails the call is
// allowed: support shouldn't depend on the counter.
export async function allowAiCall(key: string, limit: number): Promise<"ok" | "personal" | "app"> {
  try {
    if ((await countToday(key)) > limit) return "personal";
    if ((await countToday("ai:all")) > appAiLimit()) return "app";
  } catch (error) {
    console.error("Chat usage count failed:", describeError(error));
  }
  return "ok";
}

// Every email Bubble sends goes through this: at most a few per address a day (so
// sign-up can't be used to flood someone's inbox) and a budget for the whole app
// (so nobody can use up the provider's free daily allowance)
export async function allowEmail(to: string): Promise<boolean> {
  try {
    if ((await countToday(`email:${keyedHash(to.trim().toLowerCase())}`)) > EMAILS_PER_ADDRESS) return false;
    if ((await countToday("email:all")) > appEmailLimit()) return false;
  } catch (error) {
    console.error("Email count failed:", describeError(error));
  }
  return true;
}

// Failed sign-ins per email address, in 15-minute windows. Counted whether or not
// the account exists, so the limit itself can't reveal who has one.
export const SIGN_IN_FAILURES_ALLOWED = 5;
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;

function signInKey(email: string) {
  return `sign-in:${keyedHash(email.trim().toLowerCase())}:${Math.floor(Date.now() / SIGN_IN_WINDOW_MS)}`;
}

export async function signInFailures(email: string): Promise<number> {
  return readToday(signInKey(email)).catch(() => 0);
}

export async function recordSignInFailure(email: string): Promise<void> {
  await countToday(signInKey(email)).catch(() => {});
}

export async function pruneOldUsage() {
  await db.delete(chatUsage).where(lt(chatUsage.day, sql`current_date - 7`));
}
