import { create } from 'zustand';
import type { JournalEntry } from '@shared/api';
import type { Mood } from '@/models/types';

export type JournalView = 'list' | 'entry' | 'editor';

export interface Draft {
  title: string;
  content: string;
  mood: Mood;
}

export const EMPTY_DRAFT: Draft = { title: '', content: '', mood: 'neutral' };

interface JournalEditorState {
  // Whose journal this is: a different person (or nobody) signed in means starting over
  userId: string | null | undefined;
  view: JournalView;
  currentEntry: JournalEntry | null;
  // The editor works on a draft, compared with what it started from to know whether
  // leaving would lose anything
  draft: Draft;
  startedFrom: Draft;
  editingExisting: boolean;
  update: (changes: Partial<Omit<JournalEditorState, 'update' | 'reset'>>) => void;
  reset: (userId?: string | null) => void;
}

const START = {
  view: 'list' as JournalView,
  currentEntry: null,
  draft: EMPTY_DRAFT,
  startedFrom: EMPTY_DRAFT,
  editingExisting: false,
};

// The journal screen closes when you switch tabs. Keeping where you were and any
// unsaved writing here means it's still there when you come back. Memory only, never
// written to the device, and cleared on sign-out (forgetDevice).
export const useJournalEditor = create<JournalEditorState>((set) => ({
  userId: undefined,
  ...START,
  update: (changes) => set(changes),
  reset: (userId) => set({ ...START, userId }),
}));
