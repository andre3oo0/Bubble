import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { authSchema } from "@shared/schema";
import { db } from "./db";
import { emailConfigured, resetPasswordEmail, sendEmail, verifyEmail } from "./email";

// Internal header carrying the client IP to Better Auth; app.ts always overwrites it
export const CLIENT_IP_HEADER = "x-bubble-client-ip";

if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set in production");
}

if (process.env.NODE_ENV === "production" && !emailConfigured()) {
  console.warn("BREVO_API_KEY (or RESEND_API_KEY) / EMAIL_FROM not set: password reset and verification emails won't be sent");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 5000}`,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(resetPasswordEmail(user.email, user.name, url));
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
      await sendEmail(verifyEmail(user.email, user.name, url));
    },
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
});

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
