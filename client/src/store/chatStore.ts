import { create } from 'zustand';
import { Message } from '@/models/types';

interface ChatState {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  updateMessage: (id, patch) => set((state) => ({
    messages: state.messages.map((message) => (message.id === id ? { ...message, ...patch } : message)),
  })),
  clearMessages: () => set({ messages: [] }),
}));
