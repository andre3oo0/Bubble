import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import { lt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from "@shared/account";
import { authSchema, session as sessionTable, verification } from "@shared/schema";
import { db } from "./db";
import { emailConfigured, existingAccountEmail, resetPasswordEmail, sendEmail, verifyEmail, type Email } from "./email";
import { breachCheckEnabled, isBreachedPassword } from "./passwordCheck";
import { SIGN_IN_FAILURES_ALLOWED, allowEmail, recordSignInFailure, signInFailures } from "./usage";

// Internal header carrying the client IP to Better Auth; app.ts always overwrites it
export const CLIENT_IP_HEADER = "x-bubble-client-ip";

if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set in production");
}

if (process.env.NODE_ENV === "production" && !emailConfigured()) {
  console.warn("BREVO_API_KEY (or RESEND_API_KEY) / EMAIL_FROM not set: password reset and verification emails won't be sent");
}

// Google sign-in is on only when both settings exist, so the button never shows
// without working credentials behind it
export const googleSignInEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const AUTH_BASE_URL = process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 5000}`;

// Every email goes through the daily budgets in usage.ts
async function sendAuthEmail(email: Email) {
  if (!(await allowEmail(email.to))) {
    console.warn("Email not sent: daily email limit reached");
    return;
  }
  await sendEmail(email);
}

// Names only ever show inside the app, but keep them short and plain: no links or markup
function checkName(name: unknown) {
  if (name === undefined) return;
  if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_NAME_LENGTH || /[<>]|:\/\/|www\./i.test(name)) {
    throw new APIError("BAD_REQUEST", { message: `Please use just your name, up to ${MAX_NAME_LENGTH} characters, without links.` });
  }
}

const NEW_PASSWORD_FIELD: Record<string, string> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
};

const TOO_MANY_SIGN_INS =
  "Too many tries for this account. Please wait 15 minutes, or reset your password if you've forgotten it.";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: AUTH_BASE_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // With this off, signing up with an email that already has an account gets the
    // same answer as a new one, so sign-up can't be used to find out who uses Bubble.
    // The app signs the person in straight after, so they don't notice a difference.
    autoSignIn: false,
    onExistingUserSignUp: async ({ user }) => {
      await sendAuthEmail(existingAccountEmail(user.email, AUTH_BASE_URL));
    },
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail(resetPasswordEmail(user.email, url));
    },
    // A reset usually means the password may be known to someone else
    revokeSessionsOnPasswordReset: true,
  },
  // Sent so typos in the address get noticed (otherwise reset emails go nowhere),
  // but not required: nobody should be locked out of support waiting for an email
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail(verifyEmail(user.email, url));
    },
  },
  socialProviders: googleSignInEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          // Shared phones: let people pick which Google account, every time
          prompt: "select_account",
        },
      }
    : undefined,
  account: {
    // Bubble never calls Google with these, but they're stored, so not in plain text
    encryptOAuthTokens: true,
    // An email account is linked to Google only once its address is confirmed
    // (Better Auth's default), so an unconfirmed sign-up can't be taken over
  },
  user: {
    // Account and everything in it (journal, moods, sessions) is removed via ON DELETE CASCADE
    deleteUser: { enabled: true },
  },
  advanced: {
    // app.ts sets this header from Express's req.ip (which honours TRUST_PROXY), so login
    // rate limits are per visitor instead of one bucket shared by everyone
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
  },
  databaseHooks: {
    session: {
      create: {
        // The IP is still used for rate limits, but never stored: where someone signs
        // in from, tied to their account on a mental-health app, isn't ours to keep
        before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }),
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" || ctx.path === "/update-user") checkName(ctx.body?.name);

      if (ctx.path === "/sign-in/email" && typeof ctx.body?.email === "string") {
        if ((await signInFailures(ctx.body.email)) >= SIGN_IN_FAILURES_ALLOWED) {
          throw new APIError("TOO_MANY_REQUESTS", { message: TOO_MANY_SIGN_INS });
        }
      }

      const passwordField = NEW_PASSWORD_FIELD[ctx.path];
      const password = passwordField ? ctx.body?.[passwordField] : undefined;
      if (typeof password === "string" && breachCheckEnabled() && (await isBreachedPassword(password))) {
        throw new APIError("BAD_REQUEST", {
          message: "That password has shown up in a data breach elsewhere, so it isn't safe. Please choose another one.",
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Wrong passwords count against the email address, from any IP
      const returned = ctx.context.returned;
      if (ctx.path === "/sign-in/email" && isAPIError(returned) && returned.statusCode === 401 && typeof ctx.body?.email === "string") {
        await recordSignInFailure(ctx.body.email);
      }
    }),
  },
  logger: {
    // Messages only: the details Better Auth passes along can be a failed query with
    // someone's email address or name in it
    log: (level, message) => {
      (level === "error" ? console.error : console.warn)(`[auth] ${message}`);
    },
  },
});

// Expired sessions and used-up email links serve no purpose; don't keep them
export async function pruneExpiredAuthRows() {
  const now = new Date();
  await db.delete(sessionTable).where(lt(sessionTable.expiresAt, now));
  await db.delete(verification).where(lt(verification.expiresAt, now));
}

export interface AuthedLocals {
  userId: string;
}

// Rejects the request with 401 unless there's a valid session cookie
export async function requireUser(req: Request, res: Response<unknown, AuthedLocals>, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      return res.status(401).json({ error: "Please sign in first" });
    }
    res.locals.userId = session.user.id;
    next();
  } catch (error) {
    next(error);
  }
}
