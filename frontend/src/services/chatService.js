import { apiFetch } from './apiClient';

export const sendChatMessage = (message, sessionId) =>
  apiFetch('/api/chatbot/chat', { method: 'POST', body: { message, sessionId } });

export const refreshChatSession = (sessionId) =>
  apiFetch('/api/chatbot/refresh-session', { method: 'POST', body: { sessionId } });

export const sendNudgeMessage = (sessionId) =>
  apiFetch('/api/chatbot/nudge', { method: 'POST', body: { sessionId } });
