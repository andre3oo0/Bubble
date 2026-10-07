import { create } from 'zustand';

// One breathing exercise for the whole app, opened from Home, Chat and the help screen
interface BreathingState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useBreathing = create<BreathingState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
