import { useState, useRef, useEffect, useCallback } from 'react';
import { sendNudgeMessage } from '../services/chatService';

// Constants
const MIN_INACTIVITY_TIMEOUT_MS = 25000;
const MAX_INACTIVITY_TIMEOUT_MS = 35000;
const UPPER_RANGE_PROBABILITY = 0.75;
const NUDGE_BUFFER_MS = MIN_INACTIVITY_TIMEOUT_MS * 0.9;

const getRandomizedTimeout = () => {
  const range = MAX_INACTIVITY_TIMEOUT_MS - MIN_INACTIVITY_TIMEOUT_MS;
  const splitPointMs = MIN_INACTIVITY_TIMEOUT_MS + range * (1 - UPPER_RANGE_PROBABILITY);
  let timeout;
  if (Math.random() < UPPER_RANGE_PROBABILITY) {
    timeout = Math.floor(Math.random() * (MAX_INACTIVITY_TIMEOUT_MS - splitPointMs + 1)) + splitPointMs;
  } else {
    timeout = Math.floor(Math.random() * (splitPointMs - MIN_INACTIVITY_TIMEOUT_MS)) + MIN_INACTIVITY_TIMEOUT_MS;
  }
  return timeout;
};

export const useNudge = (sessionId, currentUser, isTyping, input, messages, setMessages) => {
  const [isSendingNudge, setIsSendingNudge] = useState(false);
  const inactivityTimerRef = useRef(null);
  const messagesRef = useRef(messages);
  const isSendingNudgeRef = useRef(isSendingNudge);
  
  // Keep refs updated
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isSendingNudgeRef.current = isSendingNudge;
  }, [isSendingNudge]);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const handleSendNudge = useCallback(async () => {
    const currentMessages = messagesRef.current;
    const lastMessage = currentMessages[currentMessages.length - 1];

    if (isTyping || input.trim() !== '' || isSendingNudgeRef.current || !sessionId || !currentUser) {
      return;
    }
    if (lastMessage && lastMessage.sender === 'ai') {
      const timeSinceLastMessage = Date.now() - new Date(lastMessage.timestamp).getTime();
      if (timeSinceLastMessage < NUDGE_BUFFER_MS) {
        return;
      }
    }

    setIsSendingNudge(true);

    try {
      const nudgeData = await sendNudgeMessage(sessionId);
      if (nudgeData && nudgeData.response) {
        const nudgeMessage = {
          text: nudgeData.response,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          type: 'nudge',
        };
        setMessages(prev => [...prev, nudgeMessage]);
      }
    } catch (error) {
      console.error('Failed to send nudge:', error);
    } finally {
      setIsSendingNudge(false);
    }
  }, [sessionId, currentUser, isTyping, input, setMessages]);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    if (currentUser && sessionId && !isSendingNudgeRef.current) {
      const randomTimeout = getRandomizedTimeout();
      inactivityTimerRef.current = setTimeout(handleSendNudge, randomTimeout);
    }
  }, [clearInactivityTimer, handleSendNudge, currentUser, sessionId]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!sessionId || !currentUser) return;

      if (document.hidden) {
        clearInactivityTimer();
      } else {
        const currentMessages = messagesRef.current;
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage &&
            lastMessage.sender === 'ai' &&
            lastMessage.type !== 'nudge' &&
            !isSendingNudgeRef.current)
        {
          startInactivityTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInactivityTimer();
    };
  }, [sessionId, currentUser, startInactivityTimer, clearInactivityTimer]);

  return {
    isSendingNudge,
    startInactivityTimer,
    clearInactivityTimer
  };
};