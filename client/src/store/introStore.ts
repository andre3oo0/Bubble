import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IntroState {
  // Remembered on this device so the intro shows once, on the first visit
  seen: boolean;
  isOpen: boolean;
  open: () => void;
  finish: () => void;
}

export const useIntroStore = create<IntroState>()(
  persist(
    (set) => ({
      seen: false,
      isOpen: false,
      open: () => set({ isOpen: true }),
      finish: () => set({ isOpen: false, seen: true }),
    }),
    { name: 'bubble-intro', partialize: (state) => ({ seen: state.seen }) },
  ),
);
