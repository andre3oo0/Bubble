import { boolean, date, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Server-only: database tables. The client uses the types in ./api.ts instead.

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

// Auth tables. Property names must match the fields Better Auth expects.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // Which version of the terms and privacy policy they agreed to, and when
  termsVersion: text("terms_version"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    // hashed by Better Auth, never plain text
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// App data. Everything belongs to a user and is deleted with their account.
export const journalEntries = pgTable(
  "journal_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    mood: text("mood").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("journal_entry_user_created_idx").on(table.userId, table.createdAt)],
);

export const moodCheckins = pgTable(
  "mood_checkin",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // 1 (really low) to 5 (really good), and optional feeling tags (shared/checkin.ts)
    level: integer("level").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    // The single mood word check-ins had before the scale (migration 0004 mapped it
    // onto level and tags). Kept so the mapping can be redone; new check-ins leave it empty.
    mood: text("mood"),
    createdAt: createdAt(),
  },
  (table) => [index("mood_checkin_user_created_idx").on(table.userId, table.createdAt)],
);

// Daily counters for the limits in server/usage.ts: AI messages ("user:<id>", or
// "ip:<hmac>" for guests, "ai:all" for the whole app), emails ("email:<hmac>",
// "email:all") and failed sign-ins ("sign-in:<hmac>:<window>"). Hashed with a secret
// key, so no IP or email address is ever stored here. Rows go after 7 days.
export const chatUsage = pgTable(
  "chat_usage",
  {
    key: text("key").notNull(),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.key, table.day] })],
);

export const authSchema = { user, session, account, verification };
