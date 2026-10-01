import { create } from 'zustand';

interface AccountDialogState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// Lets any panel open the sign-in dialog ("Sign in to save your journal")
export const useAccountDialog = create<AccountDialogState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
