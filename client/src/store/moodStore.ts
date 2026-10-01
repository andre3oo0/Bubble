import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Mood } from '@/models/types';

// Single source of truth for the mood shown on Bubble, set by mood check-ins,
// the avatar panel and what the user says in chat
interface MoodState {
  currentMood: Mood;
  setCurrentMood: (mood: Mood) => void;
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set) => ({
      currentMood: 'neutral',
      setCurrentMood: (mood) => set({ currentMood: mood }),
    }),
    { name: 'bubble-mood' }
  )
);
