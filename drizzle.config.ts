import { defineConfig } from "drizzle-kit";

// `npm run db:generate` only needs the schema. DATABASE_URL is used by
// `npm run db:studio` to inspect a real database.
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  ...(process.env.DATABASE_URL && { dbCredentials: { url: process.env.DATABASE_URL } }),
});
