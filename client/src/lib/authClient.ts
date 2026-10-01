import { createAuthClient } from 'better-auth/react';

// Same origin as the app, so the default /api/auth base path is right
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
