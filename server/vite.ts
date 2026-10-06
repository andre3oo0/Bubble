import { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  // Keep Vite's host check on (no allowedHosts: true): it stops other websites
  // reading source and .env files through DNS rebinding while this runs
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
  };

  // Vite's errors are logged, not fatal: a blocked file request is an error too, and
  // exiting on it would let any web page stop the dev server with one request
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: viteLogger,
    server: serverOptions,
    appType: "custom",
  });

  // Vite is meant to refuse these itself, but query tricks like ?import&raw?? have
  // got past it before. Secrets and keys are never part of the app, so refuse them here.
  app.use((req, res, next) => {
    let path = req.path;
    try {
      path = decodeURIComponent(path);
    } catch {
      return res.status(400).end();
    }
    if (/(^|[\\/])(\.env|\.git[\\/])|\.(pem|crt|key)$/i.test(path)) return res.status(403).end();
    next();
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes.
      // No ?v= cache-buster on main.tsx: Vite already handles caching, and the
      // query string leaked into main's relative imports so queryClient.ts was
      // loaded twice (two QueryClients, so invalidations never reached the UI).
      const template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
