import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/models/types';

vi.mock('./queryClient', () => ({
  apiRequest: vi.fn(async () => new Response(JSON.stringify({ title: 't', summary: 's', takeaway: 'k' }))),
}));

const { apiRequest } = await import('./queryClient');
const { reflectOnChat } = await import('./chatService');
const { useChatStore } = await import('@/store/chatStore');

const message = (patch: Partial<Message>): Message => ({
  id: crypto.randomUUID(),
  content: 'hello',
  sender: 'user',
  timestamp: new Date(),
  ...patch,
});

describe('reflectOnChat', () => {
  it("leaves out notices, offers and messages that never reached Bubble", async () => {
    await reflectOnChat([
      message({ content: 'work was a lot' }),
      message({ content: 'That does sound like a lot.', sender: 'bubble' }),
      message({ content: 'You can send again in about a minute.', sender: 'bubble', kind: 'notice' }),
      message({ content: 'Want to try breathing?', sender: 'bubble', kind: 'breathing-offer' }),
      message({ content: 'and this one failed', status: 'failed', failure: 'connection' }),
    ]);

    expect(vi.mocked(apiRequest)).toHaveBeenCalledWith('POST', '/api/chat/reflect', {
      transcript: [
        { role: 'user', content: 'work was a lot' },
        { role: 'assistant', content: 'That does sound like a lot.' },
      ],
    });
  });
});

describe('chat store', () => {
  beforeEach(() => useChatStore.getState().clearMessages());

  it('updates one message and leaves the rest alone', () => {
    const first = message({ content: 'first' });
    const second = message({ content: 'second' });
    useChatStore.getState().addMessage(first);
    useChatStore.getState().addMessage(second);

    useChatStore.getState().updateMessage(first.id, { status: 'failed', failure: 'connection' });

    const [a, b] = useChatStore.getState().messages;
    expect(a).toMatchObject({ content: 'first', status: 'failed', failure: 'connection' });
    expect(b).toEqual(second);
  });
});
