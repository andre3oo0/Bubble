import type { ChatResponse } from '@shared/chat';
import { apiRequest } from './queryClient';

// Server-side conversation context; reset on page reload
let sessionId: string | undefined;

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await apiRequest('POST', '/api/chat', { message, sessionId });
  const data: ChatResponse = await response.json();
  sessionId = data.sessionId;
  return data;
}
