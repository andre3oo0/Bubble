import { create } from 'zustand';

export type AccountMode = 'login' | 'register';
// For someone signed in: go straight to one of these (from Settings)
export type AccountAction = 'change-password' | 'delete';

interface OpenOptions {
  // Google sign-in leaves the page and comes back, which clears anything unsaved
  // (a chat, a reflection). Callers holding unsaved work turn it off.
  allowGoogle?: boolean;
  // Shown above the form, e.g. why a Google sign-in didn't work
  message?: string;
  action?: AccountAction;
}

interface AccountDialogState {
  isOpen: boolean;
  // Which form a signed-out person sees first
  startMode: AccountMode;
  allowGoogle: boolean;
  message: string;
  action: AccountAction | null;
  open: (mode?: AccountMode, options?: OpenOptions) => void;
  close: () => void;
}

// Lets any panel open the sign-in dialog ("Sign in to save your journal")
export const useAccountDialog = create<AccountDialogState>((set) => ({
  isOpen: false,
  startMode: 'login',
  allowGoogle: true,
  message: '',
  action: null,
  open: (mode = 'login', { allowGoogle = true, message = '', action } = {}) =>
    set({ isOpen: true, startMode: mode, allowGoogle, message, action: action ?? null }),
  close: () => set({ isOpen: false }),
}));
