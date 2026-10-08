import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Care } from '@shared/chat';

// "What helps you" in Settings. Kept on the device, sent with each chat message, and
// cleared on sign-out like the other personal things (forgetDevice.ts).
export const CARE_STORAGE_KEY = 'bubble-care';

const LEFT_TO_BUBBLE: Care = { hugs: 'either', approach: 'either', tone: 'either' };

interface CareState extends Care {
  set: (change: Partial<Care>) => void;
  reset: () => void;
}

export const useCare = create<CareState>()(
  persist(
    (set) => ({
      ...LEFT_TO_BUBBLE,
      set: (change) => set(change),
      reset: () => set(LEFT_TO_BUBBLE),
    }),
    { name: CARE_STORAGE_KEY },
  ),
);

export function currentCare(): Care {
  const { hugs, approach, tone } = useCare.getState();
  return { hugs, approach, tone };
}
