import { create } from 'zustand';

interface SosState {
  isOpen: boolean;
  // set once the screen has opened by itself, so it doesn't keep popping up
  autoOpened: boolean;
  open: () => void;
  close: () => void;
  openForCrisis: () => void;
}

export const useSosStore = create<SosState>((set, get) => ({
  isOpen: false,
  autoOpened: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  // Auto-open on the first crisis message only; later ones still show helplines inline
  openForCrisis: () => {
    if (get().autoOpened) return;
    set({ isOpen: true, autoOpened: true });
  },
}));
