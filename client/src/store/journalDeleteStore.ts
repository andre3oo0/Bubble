import { create } from 'zustand';

// Deleting an entry waits this long so it can be undone. The entry is hidden
// straight away; it's only removed on the server once the time is up.
export const UNDO_MS = 6000;

// Outside the store so a pending delete survives leaving the journal screen
const timers = new Map<string, ReturnType<typeof setTimeout>>();

interface JournalDeleteState {
  hidden: string[];
  schedule: (id: string, commit: () => Promise<void>, onFailed: () => void) => void;
  undo: (id: string) => void;
}

export const useJournalDelete = create<JournalDeleteState>((set) => ({
  hidden: [],
  schedule: (id, commit, onFailed) => {
    set((state) => ({ hidden: [...state.hidden, id] }));
    timers.set(
      id,
      setTimeout(async () => {
        timers.delete(id);
        try {
          await commit();
        } catch {
          // Show it again rather than pretend it's gone
          onFailed();
        } finally {
          set((state) => ({ hidden: state.hidden.filter((hiddenId) => hiddenId !== id) }));
        }
      }, UNDO_MS),
    );
  },
  undo: (id) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    set((state) => ({ hidden: state.hidden.filter((hiddenId) => hiddenId !== id) }));
  },
}));
