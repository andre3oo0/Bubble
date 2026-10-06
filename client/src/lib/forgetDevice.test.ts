import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./queryClient', () => ({
  apiRequest: vi.fn(async () =>
    new Response(JSON.stringify({ reply: 'hi', mood: 'sad', risk: 'none', sessionId: 'chat-1' })),
  ),
}));

const { apiRequest } = await import('./queryClient');
const { sendChatMessage } = await import('./chatService');
const { forgetDevice } = await import('./forgetDevice');
const { useChatStore } = await import('@/store/chatStore');
const { useMoodStore } = await import('@/store/moodStore');

beforeEach(() => vi.mocked(apiRequest).mockClear());

describe('forgetDevice', () => {
  it("clears the chat, ends Bubble's copy of it and resets the mood", async () => {
    await sendChatMessage('my day was awful');
    useChatStore.getState().addMessage({ id: '1', content: 'my day was awful', sender: 'user', timestamp: new Date() });
    useMoodStore.getState().setCurrentMood('sad');

    await forgetDevice();

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useMoodStore.getState().currentMood).toBe('neutral');
    expect(vi.mocked(apiRequest)).toHaveBeenLastCalledWith('POST', '/api/chat/end', { sessionId: 'chat-1' });
  });

  it('starts a new conversation, with a new device ID, afterwards', async () => {
    await sendChatMessage('hello');
    const before = vi.mocked(apiRequest).mock.calls.at(-1)![3]!['x-bubble-device'];
    await forgetDevice();
    vi.mocked(apiRequest).mockClear();

    await sendChatMessage('hello again');

    const [, url, body, headers] = vi.mocked(apiRequest).mock.calls[0];
    expect(url).toBe('/api/chat');
    expect(body).toEqual({ message: 'hello again', sessionId: undefined });
    expect(headers!['x-bubble-device']).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers!['x-bubble-device']).not.toBe(before);
  });
});
