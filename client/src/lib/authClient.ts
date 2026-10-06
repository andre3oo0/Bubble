import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

// Same origin as the app, so the default /api/auth base path is right.
// The extra user fields are the consent record (server/auth.ts).
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        termsVersion: { type: 'string', required: false, input: false },
        termsAcceptedAt: { type: 'date', required: false, input: false },
      },
    }),
  ],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  resetPassword,
  changePassword,
  sendVerificationEmail,
  deleteUser,
} = authClient;
