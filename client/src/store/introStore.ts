import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IntroState {
  // Remembered on this device so the intro shows once, on the first visit
  seen: boolean;
  isOpen: boolean;
  open: () => void;
  // Steps aside (e.g. for the sign-up form) without counting as seen
  pause: () => void;
  finish: () => void;
}

export const useIntroStore = create<IntroState>()(
  persist(
    (set) => ({
      seen: false,
      isOpen: false,
      open: () => set({ isOpen: true }),
      pause: () => set({ isOpen: false }),
      finish: () => set({ isOpen: false, seen: true }),
    }),
    { name: 'bubble-intro', partialize: (state) => ({ seen: state.seen }) },
  ),
);
