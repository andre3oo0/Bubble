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
  },
});
