import { endChat } from './chatService';
import { useChatStore } from '@/store/chatStore';
import { useMoodStore } from '@/store/moodStore';

// Personal things kept on the device (display preferences like the scene stay)
export const PERSONAL_STORAGE_KEYS = ['bubble-mood', 'activePanel', 'checkInTimes', 'journalEntries', 'moodHistory'];

// On sign-out and account deletion. Phones get shared: the next person shouldn't see
// the last one's chat, or carry on their conversation with Bubble.
export async function forgetDevice(): Promise<void> {
  useChatStore.getState().clearMessages();
  useMoodStore.getState().setCurrentMood('neutral');
  PERSONAL_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage can be unavailable (private mode); nothing to remove then
    }
  });
  await endChat();
}
