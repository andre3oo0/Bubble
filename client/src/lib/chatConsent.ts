import { LEGAL_VERSION } from '@shared/legal';

// Signed-out chat has no account to record agreement on, so the device remembers
// that the note before the first message was shown and a message was sent
const KEY = 'bubble-chat-terms';

export function chatTermsSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === LEGAL_VERSION;
  } catch {
    return false;
  }
}

export function rememberChatTerms(): void {
  try {
    localStorage.setItem(KEY, LEGAL_VERSION);
  } catch {
    // storage can be unavailable (private mode); the note just shows again
  }
}
