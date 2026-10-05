import type { ChatResponse, ReflectionResponse } from '@shared/chat';
import type { Message } from '@/models/types';
import { apiRequest } from './queryClient';

// Server-side conversation context; reset on page reload
let sessionId: string | undefined;

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await apiRequest('POST', '/api/chat', { message, sessionId });
  const data: ChatResponse = await response.json();
  sessionId = data.sessionId;
  return data;
}

// The conversation as the person saw it, minus the breathing offer prompts
export async function reflectOnChat(messages: Message[]): Promise<ReflectionResponse> {
  const transcript = messages
    .filter((message) => !message.kind && message.content.trim())
    .slice(-60)
    .map((message) => ({
      role: message.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: message.content.slice(0, 2000),
    }));
  return (await apiRequest('POST', '/api/chat/reflect', { transcript })).json();
}

// "Let go": the server forgets its copy and the next message starts a new chat
export async function endChat(): Promise<void> {
  const ending = sessionId;
  sessionId = undefined;
  if (ending) await apiRequest('POST', '/api/chat/end', { sessionId: ending }).catch(() => {});
}
