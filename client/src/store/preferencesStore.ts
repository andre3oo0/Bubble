import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// "system" follows the phone/computer setting (prefers-reduced-motion, prefers-color-scheme)
export type MotionPreference = 'system' | 'reduced';
export type ThemePreference = 'system' | 'day' | 'night';

interface PreferencesState {
  motion: MotionPreference;
  theme: ThemePreference;
  // The scene's colour and pace follow Bubble's mood (MoodAmbience.tsx)
  moodScene: boolean;
  setMotion: (motion: MotionPreference) => void;
  setTheme: (theme: ThemePreference) => void;
  setMoodScene: (moodScene: boolean) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      motion: 'system',
      theme: 'system',
      moodScene: true,
      setMotion: (motion) => set({ motion }),
      setTheme: (theme) => set({ theme }),
      setMoodScene: (moodScene) => set({ moodScene }),
    }),
    { name: 'bubble-preferences' },
  ),
);
