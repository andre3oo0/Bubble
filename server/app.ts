import express, { type NextFunction, type Request, type Response } from "express";
import type { Server } from "http";
import { toNodeHandler } from "better-auth/node";
import helmet from "helmet";
import { auth, CLIENT_IP_HEADER } from "./auth";
import { registerRoutes } from "./routes";
import { log } from "./log";

// Builds the API app. index.ts adds the frontend on top, tests use it as is.
export async function createApp(): Promise<{ app: express.Express; server: Server }> {
  const app = express();
  const production = process.env.NODE_ENV === "production";

  // Hosts like Render, Railway and Fly sit behind one proxy. Without this every guest
  // shares the proxy's IP, so they'd all share one daily chat limit.
  // Set TRUST_PROXY=0 if the app is ever exposed directly to the internet.
  const trustProxy = process.env.TRUST_PROXY ?? (production ? "1" : "0");
  app.set("trust proxy", Number(trustProxy) || false);

  // Security headers (CSP, no sniffing, HSTS...). Only in production: Vite's dev
  // server injects inline scripts that a strict CSP would block.
  if (production) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            // style attributes are set by React/framer; no inline <script> is ever needed.
            // Google Fonts serves the Inter stylesheet (the font files load under font-src https:)
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          },
        },
      }),
    );
  }

  // Hand Better Auth the IP Express resolved. Always overwritten, so a client can't
  // set this header itself to dodge login rate limits.
  app.use("/api/auth", (req, _res, next) => {
    req.headers[CLIENT_IP_HEADER] = req.ip ?? "";
    next();
  });

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

  // Proves to Android that the APK and this site belong together, so the app opens
  // full screen with no browser bar. Values come from the APK's signing key.
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    const packageName = process.env.ANDROID_PACKAGE_NAME;
    const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!packageName || fingerprints.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
      },
    ]);
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
