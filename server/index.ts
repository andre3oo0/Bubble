// Load .env before any other module reads process.env (e.g. the OpenAI client)
import "dotenv/config";
import { createApp } from "./app";
import { closeDatabase, migrateDatabase } from "./db";
import { log } from "./log";

(async () => {
  await migrateDatabase();

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

  // ALWAYS serve the app on port 5000, unless overridden by environment variable
  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
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
