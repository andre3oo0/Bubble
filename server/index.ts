// Load .env before any other module reads process.env (e.g. the OpenAI client)
import "dotenv/config";
import { createApp } from "./app";
import { closeDatabase, migrateDatabase } from "./db";
import { log } from "./log";

const MIGRATE_ATTEMPTS = 4;
const MIGRATE_TIMEOUT_MS = 60_000;

// Free databases (Neon) sleep when idle and can take a moment to wake, so retry
// a few times. If it still fails, exit with the reason so the deploy log shows it.
async function migrateWithRetry() {
  for (let attempt = 1; ; attempt++) {
    try {
      await Promise.race([
        migrateDatabase(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`timed out after ${MIGRATE_TIMEOUT_MS / 1000}s`)), MIGRATE_TIMEOUT_MS).unref(),
        ),
      ]);
      return;
    } catch (error) {
      // Drizzle wraps the driver error ("Failed query: ..."); the cause says why
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
      const reason = cause instanceof Error ? cause.message : String(cause);
      if (attempt >= MIGRATE_ATTEMPTS) {
        console.error(`Database not ready after ${attempt} attempts (${reason}). Check DATABASE_URL.`);
        process.exit(1);
      }
      log(`database not ready (${reason}), retrying in ${attempt * 5}s`, "startup");
      await new Promise((resolve) => setTimeout(resolve, attempt * 5_000));
    }
  }
}

(async () => {
  log(`starting (${process.env.DATABASE_URL ? "postgres" : "embedded database"})`, "startup");
  await migrateWithRetry();
  log("database ready", "startup");

  const { app, server } = await createApp();

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  // Port 5000 unless overridden. The dev server only listens on this machine: on a
  // shared network, anyone could otherwise reach Vite's file serving. HOST=0.0.0.0
  // opens it up (e.g. to try it on a phone on a trusted home network).
  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST || (app.get("env") === "development" ? "127.0.0.1" : "0.0.0.0");
  server.listen(port, host, () => {
    log(`serving on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  });

  // Hosts send SIGTERM before replacing the app on deploy: finish in-flight
  // requests, close the database, then exit. Force-exit if that takes too long.
  const shutdown = (signal: string) => {
    log(`${signal} received, shutting down`);
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async () => {
      await closeDatabase().catch(() => {});
      process.exit(0);
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
})();
