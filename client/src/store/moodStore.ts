import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Mood } from '@/models/types';

// Bubble's own mood, shown on its face: set on the Mood screen (a check-in, or just
// telling Bubble when signed out) and by what the person says in chat
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
