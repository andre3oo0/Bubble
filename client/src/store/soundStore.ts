import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import audioHandler, { type SoundId } from '@/lib/audioHandler';

// Sound only ever starts from a tap; it keeps playing while you move between tabs
interface SoundState {
  playing: SoundId | null;
  volume: number;
  play: (id: SoundId) => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      playing: null,
      volume: 0.35,
      play: async (id) => {
        audioHandler.setVolume(get().volume);
        const started = await audioHandler.play(id);
        set({ playing: started ? id : null });
      },
      stop: () => {
        audioHandler.stop();
        set({ playing: null });
      },
      setVolume: (volume) => {
        audioHandler.setVolume(volume);
        set({ volume });
      },
    }),
    // Only the volume is remembered; nothing plays by itself on the next visit
    { name: 'bubble-sound', partialize: (state) => ({ volume: state.volume }) },
  ),
);
