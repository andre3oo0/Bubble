import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "client", "src"),
      "@shared": path.resolve(rootDir, "shared"),
    },
  },
  test: {
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "client/src/**/*.test.{ts,tsx}"],
    environment: "node",
    // PGlite startup and password hashing are CPU-heavy when files run in parallel
    testTimeout: 20000,
    hookTimeout: 60000,
    // In-memory Postgres and throwaway secrets, nothing touches real services
    env: {
      PGLITE_DIR: "memory://",
      BETTER_AUTH_SECRET: "test-secret-not-for-production-0123456789",
      BETTER_AUTH_URL: "http://localhost:5000",
      OPENAI_API_KEY: "test-key",
    },
  },
});
