import { createHmac } from "crypto";
import { lt, sql } from "drizzle-orm";
import { chatUsage } from "@shared/schema";
import { db } from "./db";

// 0 is a valid limit (turns guest chat off), so don't use `|| default`
function envLimit(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isNaN(value) || value < 0 ? fallback : value;
}

// Read at call time so tests (and a restart with new env) can change them
const userLimit = () => envLimit("CHAT_DAILY_LIMIT_USER", 150);
const guestLimit = () => envLimit("CHAT_DAILY_LIMIT_GUEST", 40);

export function usageKey(userId: string | undefined, ip: string | undefined) {
  if (userId) return { key: `user:${userId}`, limit: userLimit() };
  // Keyed hash so the stored value can't be turned back into an IP address
  const hashed = createHmac("sha256", process.env.BETTER_AUTH_SECRET || "dev-secret")
    .update(ip || "unknown")
    .digest("hex")
    .slice(0, 32);
  return { key: `ip:${hashed}`, limit: guestLimit() };
}

// Adds one to today's count and returns the new total
export async function recordChatMessage(key: string): Promise<number> {
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

export async function pruneOldUsage() {
  await db.delete(chatUsage).where(lt(chatUsage.day, sql`current_date - 7`));
}
