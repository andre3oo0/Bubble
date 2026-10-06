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
// Everyone signed out on one network together (a school, an office): higher than one
// device's allowance, so a shared network isn't used up by one person, but capped so
// clearing storage or scripting fresh device IDs can't get round the limit
const networkLimit = () => envLimit("CHAT_DAILY_LIMIT_NETWORK", 200);
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

export interface UsageKey {
  key: string;
  limit: number;
  // Signed-out people on a device: the shared allowance for their network as well
  network?: { key: string; limit: number };
}

// The random ID the browser makes for itself (client/src/lib/deviceId.ts)
const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usageKey(userId: string | undefined, ip: string | undefined, deviceId?: string): UsageKey {
  if (userId) return { key: `user:${userId}`, limit: userLimit() };
  // One IPv6 connection usually gets a whole /64 or more, so changing the last part
  // of the address would mean a fresh limit. Count the /56 network instead.
  const networkKey = `ip:${keyedHash(ip ? ipKeyGenerator(ip, 56) : "unknown")}`;
  // No usable device ID (an old app version, a script): the network's count, at the
  // device allowance, as before
  if (!deviceId || !DEVICE_ID.test(deviceId)) return { key: networkKey, limit: guestLimit() };
  return {
    key: `device:${keyedHash(deviceId.toLowerCase())}`,
    limit: guestLimit(),
    network: { key: `network:${networkKey.slice(3)}`, limit: networkLimit() },
  };
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

// One AI call for this person: "personal" when they (or, signed out, their network)
// are over the daily limit, "app" when the whole app is over its daily budget. If
// counting fails the call is allowed: support shouldn't depend on the counter.
export async function allowAiCall({ key, limit, network }: UsageKey): Promise<"ok" | "personal" | "app"> {
  try {
    if ((await countToday(key)) > limit) return "personal";
    if (network && (await countToday(network.key)) > network.limit) return "personal";
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
