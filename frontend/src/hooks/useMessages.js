import { useState, useEffect, useCallback, useRef } from 'react';
import { sendChatMessage } from '../services/chatService';

export const useMessages = (sessionId, currentUser, hasInitialized, setHasInitialized, clearInactivityTimer, showError) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [blockInfo, setBlockInfo] = useState(null);
  const [typingMessage, setTypingMessage] = useState('');
  const [isAnimatingTyping, setIsAnimatingTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const bufferTimeoutRef = useRef(null);

  // Typing animation configuration
  const TYPING_CONFIG = {
    bufferTime: 0,
    charactersPerSecond: 100,
    punctuationDelay: 60,
  };

  const calculateTypingSpeed = useCallback(() => {
    return 1000 / TYPING_CONFIG.charactersPerSecond;
  }, []);

  const simulateTyping = useCallback(async (fullMessage, messageId, requestStartTime = null, isBlockingMessage = false) => {
    const characters = fullMessage.split('');
    const millisecondsPerCharacter = calculateTypingSpeed();
    
    setIsAnimatingTyping(true);
    setTypingMessage('');
    
    let actualBufferTime = TYPING_CONFIG.bufferTime;
    
    if (requestStartTime) {
      const backendResponseTime = Date.now() - requestStartTime;
      
      if (backendResponseTime >= TYPING_CONFIG.bufferTime) {
        actualBufferTime = 0;
      } else {
        actualBufferTime = TYPING_CONFIG.bufferTime - backendResponseTime;
      }
      
      console.log(`Backend response time: ${backendResponseTime}ms, Adjusted buffer: ${actualBufferTime}ms`);
    }
    
    if (actualBufferTime > 0) {
      await new Promise(resolve => {
        bufferTimeoutRef.current = setTimeout(resolve, actualBufferTime);
      });
    }
    
    for (let i = 0; i < characters.length; i++) {
      if (!sessionId) break;
      
      const currentText = characters.slice(0, i + 1).join('');
      setTypingMessage(currentText);
      
      let delay = millisecondsPerCharacter;
      
      const currentChar = characters[i];
      if (currentChar && /[.!?;:]/.test(currentChar)) {
        delay += TYPING_CONFIG.punctuationDelay;
      }
      
      if (i < characters.length - 1) {
        await new Promise(resolve => {
          typingTimeoutRef.current = setTimeout(resolve, delay);
        });
      }
    }
    
    setIsAnimatingTyping(false);
    setTypingMessage('');
    setIsTyping(false);
    
    const finalMessage = {
      text: fullMessage,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      id: messageId,
      type: isBlockingMessage ? 'blocking' : 'normal'
    };
    
    setMessages(prev => [...prev, finalMessage]);
    
    return new Promise(resolve => setTimeout(resolve, 100));
  }, [sessionId, calculateTypingSpeed]);

  const clearTypingTimeouts = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTypingTimeouts();
    };
  }, [clearTypingTimeouts]);

  // Load saved messages and block status from sessionStorage
  useEffect(() => {
    if (!sessionId || hasInitialized) return;

    try {
      // Load messages from sessionStorage (still want to persist messages within session)
      const savedMessages = localStorage.getItem(`chat_messages_${sessionId}`);
      
      // Load block status from sessionStorage
      const savedBlockStatus = sessionStorage.getItem(`user_blocked_${sessionId}`);
      
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      
      if (savedBlockStatus) {
        const blockData = JSON.parse(savedBlockStatus);
        // Check if block has expired
        if (blockData.blockExpiresAt && new Date() < new Date(blockData.blockExpiresAt)) {
          setIsUserBlocked(true);
          setBlockInfo(blockData);
        } else {
          // Block has expired, clear it
          sessionStorage.removeItem(`user_blocked_${sessionId}`);
        }
      }
      
      setHasInitialized(true);
    } catch (err) {
      console.error("Error loading previous session data:", err);
      localStorage.removeItem(`chat_messages_${sessionId}`);
      sessionStorage.removeItem(`user_blocked_${sessionId}`);
    }
  }, [sessionId, hasInitialized, setHasInitialized]);

  // Save messages to sessionStorage
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;

    try {
      localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(messages));
    } catch (err) {
      console.error("Error saving messages:", err);
      showError("Could not save chat history.");
    }
  }, [messages, sessionId, showError]);

  // Save block status to sessionStorage
  useEffect(() => {
    if (!sessionId) return;

    try {
      if (isUserBlocked && blockInfo) {
        sessionStorage.setItem(`user_blocked_${sessionId}`, JSON.stringify(blockInfo));
      } else {
        sessionStorage.removeItem(`user_blocked_${sessionId}`);
      }
    } catch (err) {
      console.error("Error saving block status:", err);
    }
  }, [isUserBlocked, blockInfo, sessionId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessage, scrollToBottom]);

  const sendAutoWelcomeMessage = useCallback(async () => {
    if (!sessionId || !currentUser || isTyping || isUserBlocked) return;

    setIsTyping(true);
    const requestStartTime = Date.now();

    try {
      const responseData = await sendChatMessage("", sessionId);
      if (responseData && responseData.response) {
        const messageId = Date.now().toString();
        
        if (responseData.userBlocked) {
          await simulateTyping(responseData.response, messageId, requestStartTime, true);
          
          setIsUserBlocked(true);
          setBlockInfo({
            blockReason: responseData.blockReason,
            blockExpiresAt: responseData.blockExpiresAt,
            crisisInfo: responseData.crisisInfo,
            autoUnblockIn: responseData.autoUnblockIn
          });
        } else {
          await simulateTyping(responseData.response, messageId, requestStartTime);
        }
      }
    } catch (error) {
      console.error('Failed to get auto-welcome message:', error);
      setIsTyping(false);
    } finally {
      setHasInitialized(true);
    }
  }, [sessionId, currentUser, isTyping, isUserBlocked, setHasInitialized, simulateTyping]);

  useEffect(() => {
    if (sessionId && currentUser && !isTyping && !hasInitialized && !isUserBlocked) {
      const savedMessages = localStorage.getItem(`chat_messages_${sessionId}`);
      if (!savedMessages || JSON.parse(savedMessages).length === 0) {
        sendAutoWelcomeMessage();
      } else {
        setHasInitialized(true);
      }
    }
  }, [sessionId, currentUser, isTyping, hasInitialized, isUserBlocked, sendAutoWelcomeMessage, setHasInitialized]);

  // Handle sending a message - let server decide if user should be blocked
  const handleSend = useCallback(async (messageText = input.trim()) => {
    const trimmedInput = typeof messageText === 'string' ? messageText.trim() : input.trim();
    if (!trimmedInput || !currentUser || !sessionId || isTyping) return;

    // Don't check isUserBlocked here - let the server decide and respond accordingly
    clearInactivityTimer();
    clearTypingTimeouts();

    const newMessage = {
      text: trimmedInput,
      sender: 'user',
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsTyping(true);
    setIsAnimatingTyping(false);
    setTypingMessage('');

    const requestStartTime = Date.now();

    try {
      const responseData = await sendChatMessage(trimmedInput, sessionId);

      if (responseData && responseData.response) {
        const messageId = (Date.now() + 1).toString();
        
        // Handle user blocking from server response
        if (responseData.userBlocked) {
          // Display the blocking message as a chat message
          await simulateTyping(responseData.response, messageId, requestStartTime, true);
          
          // Set the block status for future messages
          setIsUserBlocked(true);
          setBlockInfo({
            blockReason: responseData.blockReason,
            blockExpiresAt: responseData.blockExpiresAt,
            crisisInfo: responseData.crisisInfo,
            autoUnblockIn: responseData.autoUnblockIn,
            timeRemaining: responseData.timeRemaining
          });
          
          showError(`Access temporarily restricted. ${responseData.autoUnblockIn ? `Will be restored in ${responseData.autoUnblockIn}.` : 'Please contact support if this continues.'}`);
        } else {
          // Normal AI response
          await simulateTyping(responseData.response, messageId, requestStartTime);
        }
      } else {
        console.error('Invalid response from server:', responseData);
        showError('Received an unexpected response from the AI.');
        setMessages(prev => prev.filter(msg => msg.timestamp !== newMessage.timestamp));
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      showError('Failed to get response. Please try again.');
      setMessages(prev => prev.filter(msg => msg.timestamp !== newMessage.timestamp));
      setIsTyping(false);
    }
  }, [input, currentUser, sessionId, isTyping, clearInactivityTimer, showError, simulateTyping, clearTypingTimeouts]);

  // Handle input change - only block if currently blocked in this session
  const handleInputChange = useCallback((e) => {
    if (isUserBlocked) return; // Only prevent if blocked in current session
    
    setInput(e.target.value);
    if (e.target.value.trim() !== '') {
      clearInactivityTimer();
    }
  }, [isUserBlocked, clearInactivityTimer]);

  // Clear messages and block status
  const clearMessages = useCallback(() => {
    clearTypingTimeouts();
    setMessages([]);
    setIsUserBlocked(false);
    setBlockInfo(null);
    setTypingMessage('');
    setIsAnimatingTyping(false);
    setIsTyping(false);
    if (sessionId) {
      localStorage.removeItem(`chat_messages_${sessionId}`);
      sessionStorage.removeItem(`user_blocked_${sessionId}`);
    }
  }, [sessionId, clearTypingTimeouts]);

  // Manual function to check and clear expired blocks
  const checkBlockExpiry = useCallback(() => {
    if (isUserBlocked && blockInfo?.blockExpiresAt) {
      if (new Date() >= new Date(blockInfo.blockExpiresAt)) {
        setIsUserBlocked(false);
        setBlockInfo(null);
        sessionStorage.removeItem(`user_blocked_${sessionId}`);
        return true;
      }
    }
    return false;
  }, [isUserBlocked, blockInfo, sessionId]);

  return {
    messages,
    setMessages,
    isTyping,
    input,
    setInput,
    messagesEndRef,
    handleSend,
    handleInputChange,
    clearMessages,
    isUserBlocked,
    blockInfo,
    checkBlockExpiry,
    typingMessage,
    isAnimatingTyping
  };
};