// Load .env before any other module reads process.env (e.g. the OpenAI client)
import "dotenv/config";
import { createApp } from "./app";
import { migrateDatabase } from "./db";
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
})();
