import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// "system" follows the phone/computer setting (prefers-reduced-motion, prefers-color-scheme)
export type MotionPreference = 'system' | 'reduced';
export type ThemePreference = 'system' | 'day' | 'night';

interface PreferencesState {
  motion: MotionPreference;
  theme: ThemePreference;
  setMotion: (motion: MotionPreference) => void;
  setTheme: (theme: ThemePreference) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      motion: 'system',
      theme: 'system',
      setMotion: (motion) => set({ motion }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'bubble-preferences' },
  ),
);
