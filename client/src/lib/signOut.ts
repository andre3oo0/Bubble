import type { QueryClient } from '@tanstack/react-query';
import { signOut } from './authClient';
import { forgetDevice } from './forgetDevice';

// Signs out and leaves nothing of the person behind on a shared device: their
// journal and moods in memory, the chat, the current mood
export async function signOutHere(queryClient: QueryClient): Promise<void> {
  await signOut();
  queryClient.clear();
  await forgetDevice();
}
