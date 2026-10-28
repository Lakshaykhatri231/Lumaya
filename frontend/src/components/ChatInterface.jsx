import React from 'react';
import { useToast } from '../hooks/useToast';
import { useSession } from '../hooks/useSession';
import { useMessages } from '../hooks/useMessages';
import { useNudge } from '../hooks/useNudge';
import { useMoodTracker } from '../hooks/useMoodTracker';
import LoadingDots from './LoadingDots';
import FloatingLeaf from './FloatingLeaf';
import mountains from '../assets/bg3.jpg';

const ChatInterface = ({ user: propUser }) => {
  const { showSuccess, showError } = useToast();
  
  const { 
    sessionId, 
    currentUser, 
    hasInitialized, 
    setHasInitialized, 
    handleRefreshSession 
  } = useSession(propUser, showError, showSuccess);
  
  const { selectedMood, trackMood } = useMoodTracker(sessionId, currentUser?.id);
  
  const {
    messages,
    setMessages,
    isTyping,
    input,
    messagesEndRef,
    handleSend,
    handleInputChange,
    clearMessages,
    isUserBlocked,
    blockInfo,
    checkBlockExpiry,
    typingMessage,
    isAnimatingTyping
  } = useMessages(sessionId, currentUser, hasInitialized, setHasInitialized, () => {}, showError);
  
  const { isSendingNudge, startInactivityTimer, clearInactivityTimer } = useNudge(
    sessionId,
    currentUser,
    isTyping,
    input,
    messages,
    setMessages
  );
  
  React.useEffect(() => {
    if (!sessionId) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (lastMessage.sender === 'ai' && lastMessage.type !== 'nudge') {
        if (!isSendingNudge && !isUserBlocked && !isAnimatingTyping) {
          startInactivityTimer();
        } else {
          clearInactivityTimer();
        }
      } else if (lastMessage.sender === 'user') {
        clearInactivityTimer();
      } else if (lastMessage.sender === 'ai' && lastMessage.type === 'nudge') {
        clearInactivityTimer();
      }
    } else {
      clearInactivityTimer();
    }
    
    return () => {
      clearInactivityTimer();
    };
  }, [messages, sessionId, isSendingNudge, isUserBlocked, isAnimatingTyping, startInactivityTimer, clearInactivityTimer]);

  // Check for block expiry with precise timeout
  React.useEffect(() => {
    if (!isUserBlocked || !blockInfo?.blockExpiresAt) return;

    const expiresAt = new Date(blockInfo.blockExpiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;

    // If already expired, clear immediately
    if (timeUntilExpiry <= 0) {
      if (checkBlockExpiry()) {
        showSuccess('Access has been restored. You can now send messages again.');
      }
      return;
    }

    // Set a single timeout for the exact expiry time
    const timeout = setTimeout(() => {
      if (checkBlockExpiry()) {
        showSuccess('Access has been restored. You can now send messages again.');
      }
    }, timeUntilExpiry);

    return () => clearTimeout(timeout);
  }, [isUserBlocked, blockInfo?.blockExpiresAt, checkBlockExpiry, showSuccess]);
  
  const handleFullRefresh = async () => {
    if (await handleRefreshSession()) {
      clearMessages();
    }
  };

  // Efficient countdown with state updates only when display changes
  const [remainingTime, setRemainingTime] = React.useState(null);

  React.useEffect(() => {
    if (!isUserBlocked || !blockInfo?.blockExpiresAt) {
      setRemainingTime(null);
      return;
    }

    const updateRemainingTime = () => {
      const now = new Date();
      const expiresAt = new Date(blockInfo.blockExpiresAt);
      const remainingMs = expiresAt - now;
      
      if (remainingMs <= 0) {
        setRemainingTime(null);
        return false; // Stop updating
      }
      
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
      const newTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      setRemainingTime(newTime);
      return true; // Continue updating
    };

    // Initial update
    if (!updateRemainingTime()) return;

    // Only update every 30 seconds for display purposes
    const interval = setInterval(() => {
      if (!updateRemainingTime()) {
        clearInterval(interval);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isUserBlocked, blockInfo?.blockExpiresAt]);

  const getRemainingTime = () => remainingTime;

  const isInputDisabled = !currentUser || !sessionId || isTyping || isSendingNudge || isUserBlocked;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-cover bg-center overflow-hidden" 
         style={{ backgroundImage: `url(${mountains})` }}>
      <FloatingLeaf className="text-teal-400/40" />
      <FloatingLeaf className="text-teal-500/40" />
      <FloatingLeaf className="text-teal-600/40" />
      
      {/* Main Container - Perfectly Centered */}
      <div className="flex flex-row w-full max-w-7xl h-[75vh] rounded-xl shadow-2xl overflow-hidden mx-4">
        {/* Left Section - Static */}
        <div className="w-64 md:w-72 bg-white/10 backdrop-blur-lg border-r border-white/10 flex-shrink-0">
          <div className="h-full flex flex-col p-2 md:p-3">
            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-3">
              <div className="w-8 h-8 mb-1">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L4 15h16L12 3z" stroke="currentColor" strokeWidth="2" className="text-green-600"/>
                  <rect x="11" y="14" width="2" height="7" fill="currentColor" className="text-green-600"/>
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-700">Mood & Sentiment Tracker</h3>
            </div>

            {/* User Block Status Warning */}
            {isUserBlocked && (
              <div className="bg-red-100/80 border border-red-300/50 rounded-lg p-2 mb-3">
                <div className="flex items-center mb-1">
                  <svg className="w-4 h-4 text-red-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs font-medium text-red-700">Access Restricted</span>
                </div>
                <p className="text-xs text-red-700">
                  Chat is temporarily blocked for your safety.
                  {getRemainingTime() && (
                    <><br />Restores in: {getRemainingTime()}</>
                  )}
                </p>
              </div>
            )}

            {/* Mood Selection */}
            <div className="flex justify-around mb-3">
              <button
                onClick={() => trackMood('positive')}
                disabled={isUserBlocked}
                className={`p-1 rounded-full transition-all ${
                  selectedMood === 'positive' 
                    ? 'bg-white/50 scale-110' 
                    : 'bg-white/30 hover:bg-white/40'
                } ${isUserBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-lg">😊</span>
              </button>
              <button
                onClick={() => trackMood('neutral')}
                disabled={isUserBlocked}
                className={`p-1 rounded-full transition-all ${
                  selectedMood === 'neutral' 
                    ? 'bg-white/50 scale-110' 
                    : 'bg-white/30 hover:bg-white/40'
                } ${isUserBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-lg">😐</span>
              </button>
              <button
                onClick={() => trackMood('negative')}
                disabled={isUserBlocked}
                className={`p-1 rounded-full transition-all ${
                  selectedMood === 'negative' 
                    ? 'bg-white/50 scale-110' 
                    : 'bg-white/30 hover:bg-white/40'
                } ${isUserBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-lg">😔</span>
              </button>
            </div>

            {/* Calming Quote */}
            <div className="bg-white/10 rounded-xl p-2 mb-3">
              <h4 className="text-xs font-medium text-gray-600 mb-1">Calming Quote of Day</h4>
              <p className="text-xs text-gray-700 italic">
                "Peace comes from within. Do not seek it without."
              </p>
            </div>

            {/* Session History */}
            <div className="flex-grow overflow-y-auto">
              <h4 className="text-xs font-medium text-gray-600 mb-1">SESSION HISTORY</h4>
              <div className="space-y-1">
                {['Today', 'Yesterday', 'Last Week'].map((period, index) => (
                  <button
                    key={index}
                    disabled={isUserBlocked}
                    className={`w-full text-left px-2 py-1 rounded-lg bg-white/10 text-gray-600 hover:bg-white/20 transition-colors text-xs ${
                      isUserBlocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* New Session Button */}
            <button
              onClick={handleFullRefresh}
              disabled={!currentUser || !sessionId || isUserBlocked}
              className={`w-full px-2 py-1 rounded-lg bg-white/20 text-gray-700 hover:bg-white/30 transition-colors disabled:opacity-50 mt-2 text-xs ${
                isUserBlocked ? 'cursor-not-allowed' : ''
              }`}
            >
              New Session
            </button>
          </div>
        </div>

        {/* Chat Section - Scrollable */}
        <div className="flex-1 flex flex-col backdrop-blur-sm min-w-0">
          {/* Chat Header */}
          <div className="bg-white/20 p-2 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700">Mindful Chat</h2>
              {isUserBlocked && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-red-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-4v-2a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" />
                  </svg>
                  <span className="text-xs text-red-700 font-medium">Chat Restricted</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area - Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2">
            {messages.map((message, index) => (
  <div
    key={`${message.sender}-${message.timestamp}-${index}`}
    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[80%] rounded-2xl p-2 ${
        message.sender === 'user'
          ? 'bg-white/60 ml-4'
          : message.type === 'blocking'
          ? 'bg-red-100/80 border border-red-300/50 mr-4'
          : 'bg-white/40 mr-4'
      }`}
    >
      {message.type === 'blocking' && (
        <div className="flex items-center mb-1">
          <svg className="w-4 h-4 text-red-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-xs font-medium text-red-700">Safety Notice</span>
        </div>
      )}
      <p className={`whitespace-pre-wrap text-sm ${
        message.type === 'blocking' ? 'text-red-700' : 'text-gray-700'
      }`}>{message.text}</p>
      <span className={`text-xs mt-1 block text-right ${
        message.type === 'blocking' ? 'text-red-500' : 'text-gray-500'
      }`}>
        {new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </span>
    </div>
  </div>
))}
            
            {/* Typing Animation - Show either loading dots or typing message */}
{(isTyping || isAnimatingTyping) && (
  <div className="flex justify-start">
    <div className="max-w-[80%] bg-white/40 rounded-2xl p-2 mr-4">
      {isTyping && !isAnimatingTyping ? (
        <LoadingDots />
      ) : isAnimatingTyping && typingMessage ? (
        <>
          <p className="text-gray-700 whitespace-pre-wrap text-sm">
            {typingMessage}
            <span className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5" style={{
              animation: 'blink 1s infinite'
            }}></span>
          </p>
          <style jsx>{`
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0; }
            }
          `}</style>
        </>
      ) : (
        <LoadingDots />
      )}
    </div>
  </div>
)}
            <div ref={messagesEndRef} />
          </div>

          {/* Block Status Banner */}
          {isUserBlocked && (
            <div className="bg-red-50/90 border-t border-red-200/50 px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
                  </svg>
                  <span className="text-xs text-red-700">Input blocked for your safety</span>
                </div>
                {getRemainingTime() && (
                  <span className="text-xs text-red-600 font-medium">
                    {getRemainingTime()} remaining
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Response Buttons */}
          <div className="bg-white/20 px-2 py-1 flex gap-1 justify-center flex-wrap">
            {!isUserBlocked && (
              !messages.length ? (
                ['I\'m feeling anxious', 'I need someone to talk to'].map((text, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(text)}
                    disabled={isInputDisabled}
                    className="px-2 py-1 rounded-full bg-white/40 text-gray-700 hover:bg-white/50 transition-all text-xs disabled:opacity-50"
                  >
                    {text}
                  </button>
                ))
              ) : (
                ['Sure', "I'm feeling good", 'Can you help me?', "What's new?"].map((text, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(text)}
                    disabled={isInputDisabled}
                    className="px-2 py-1 rounded-full bg-white/40 text-gray-700 hover:bg-white/50 transition-all text-xs disabled:opacity-50"
                  >
                    {text}
                  </button>
                ))
              )
            )}
          </div>

          {/* Input Area */}
          <div className="p-2 bg-white/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && !isInputDisabled && handleSend()}
                placeholder={isUserBlocked ? "Chat is temporarily restricted..." : "Message..."}
                className={`flex-1 px-3 py-1 rounded-full bg-white/50 placeholder-gray-500 text-gray-700 focus:outline-none focus:ring-1 focus:ring-white/50 text-sm ${
                  isUserBlocked ? 'cursor-not-allowed' : ''
                }`}
                disabled={isInputDisabled}
              />
              <button
                onClick={() => handleSend()}
                disabled={isInputDisabled || !input.trim()}
                className="p-1 rounded-full bg-white/50 text-gray-700 hover:bg-white/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;