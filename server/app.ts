import express, { type NextFunction, type Request, type Response } from "express";
import type { Server } from "http";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { registerRoutes } from "./routes";
import { log } from "./log";

// Builds the API app. index.ts adds the frontend on top, tests use it as is.
export async function createApp(): Promise<{ app: express.Express; server: Server }> {
  const app = express();

  // Better Auth reads the raw body itself, so it must come before express.json()
  app.all("/api/auth/*", toNodeHandler(auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Method, path, status and timing only. Bodies are never logged: they hold
  // journal entries and chat messages.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });
    next();
  });

  const server = await registerRoutes(app);

  // Unknown API routes get JSON, not the frontend's index.html
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error(err);
    if (!res.headersSent) {
      res.status(status).json({ error: status === 500 ? "Something went wrong" : err.message });
    }
  });

  return { app, server };
}
