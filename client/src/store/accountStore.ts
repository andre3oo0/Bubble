import { create } from 'zustand';

export type AccountMode = 'login' | 'register';

interface OpenOptions {
  // Google sign-in leaves the page and comes back, which clears anything unsaved
  // (a chat, a reflection). Callers holding unsaved work turn it off.
  allowGoogle?: boolean;
  // Shown above the form, e.g. why a Google sign-in didn't work
  message?: string;
}

interface AccountDialogState {
  isOpen: boolean;
  // Which form a signed-out person sees first
  startMode: AccountMode;
  allowGoogle: boolean;
  message: string;
  open: (mode?: AccountMode, options?: OpenOptions) => void;
  close: () => void;
}

// Lets any panel open the sign-in dialog ("Sign in to save your journal")
export const useAccountDialog = create<AccountDialogState>((set) => ({
  isOpen: false,
  startMode: 'login',
  allowGoogle: true,
  message: '',
  open: (mode = 'login', { allowGoogle = true, message = '' } = {}) =>
    set({ isOpen: true, startMode: mode, allowGoogle, message }),
  close: () => set({ isOpen: false }),
}));
