import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Shield,
  BookOpen,
  Info,
  Menu,
  Send,
  Square
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { useToast } from '../hooks/useToast';
import { useSession } from '../hooks/useSession';
import { useMessages } from '../hooks/useMessages';
import { useNudge } from '../hooks/useNudge';
import LoadingDots from './LoadingDots';
import './styles.css';

// MessageBubble Component
const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user' || message.role === 'user';
  const isLoading = message.isLoading;

  return (
    <div className="message-bubble-wrapper">
      <div className={`message-bubble-container ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`message-bubble-inner ${isUser ? 'ml-auto' : 'mr-auto'}`}>
          {isLoading ? (
            <div className="message-loading-bubble">
              <div className="loading-dots">
                <div className="dot" style={{ animationDelay: '0ms' }}></div>
                <div className="dot" style={{ animationDelay: '150ms' }}></div>
                <div className="dot" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : (
            <div className={`message-bubble ${isUser ? 'user' : 'bot'}`}>
              <p className="message-content">
                {message.content || message.text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({
  messages,
  onNewSession,
  onScrollToMessage,
  collapsed,
  onToggleCollapse,
  currentUser,
  sessionId,
  isUserBlocked,
}) => {
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsMobileOpen(false);
      }
    }

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileOpen]);

  const userMessages = messages?.filter((message) => 
    message.sender === 'user' || message.role === 'user'
  ) || [];

  const truncateText = (text, maxLength = 40) => {
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    return lastSpaceIndex > 20 ? truncated.slice(0, lastSpaceIndex) : truncated;
  };

  if (collapsed) {
    return (
      <>
        <button
          className="hamburger-button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} />
        </button>

        <div className="sidebar-collapsed">
          <button className="icon-button" onClick={onToggleCollapse}>
            <PanelLeft size={20} />
          </button>
          <button 
            className={`icon-button disabled:opacity-50 ${
              isUserBlocked ? 'cursor-not-allowed' : ''
            }`}
            onClick={onNewSession}
            disabled={!currentUser || !sessionId || isUserBlocked}
          >
            <Plus size={20} />
          </button>
        </div>

        {isMobileOpen && (
          <div
            ref={sidebarRef}
            className="sidebar-container mobile-open"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sidebar-header">
              <button
                className="icon-button"
                onClick={() => {
                  setIsMobileOpen(false);
                }}
              >
                <PanelLeftClose size={20} />
              </button>
              <button 
                className={`new-chat-button disabled:opacity-50 ${
                  isUserBlocked ? 'cursor-not-allowed' : ''
                }`}
                onClick={onNewSession}
                disabled={!currentUser || !sessionId || isUserBlocked}
              >
                <Plus size={16} style={{ marginRight: '8px' }} />
                New Session
              </button>
            </div>

            <div className="sidebar-messages">
              {userMessages.length === 0 ? (
                <div className="empty-message">
                  No messages yet.
                  <br />
                  Start a conversation!
                </div>
              ) : (
                userMessages.map((message) => (
                  <div
                    key={message.id}
                    className="message-wrapper"
                    onMouseEnter={() => setHoveredMessage(message.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <button
                      className={`message-button ${
                        hoveredMessage === message.id ? 'hovered' : ''
                      }`}
                      onClick={() => {
                        onScrollToMessage(message.id);
                        setIsMobileOpen(false); 
                      }}
                    >
                      <MessageSquare size={16} className="message-icon" />
                      <span className="message-text">
                        {truncateText(message.content || message.text)}
                      </span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="sidebar-footer">
              <button className="footer-button" onClick={() => navigate('/privacy')}>
                <Shield size={16} className="footer-icon" />
                <span>Privacy Policy</span>
              </button>
              <button className="footer-button" onClick={() => navigate('/chat-guide')}>
                <BookOpen size={16} className="footer-icon" />
                <span>Chat Guide</span>
              </button>
              <button className="footer-button">
                <Info size={16} className="footer-icon" />
                <span>About Us</span>
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {!isMobileOpen && (
      <button
        className="hamburger-button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open Sidebar">
         <Menu size={24}  />
       </button>
      )}

    {isMobileOpen && (
      <div className="mobile-overlay" onClick={() => setIsMobileOpen(false)} />
    )}

      <div
        ref={sidebarRef}
        className={`sidebar-container ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
      >
        <div className="sidebar-header">
          <button className="icon-button" onClick={onToggleCollapse}>
            <PanelLeftClose size={20} />
          </button>
          <button 
            className={`new-chat-button disabled:opacity-50 ${
              isUserBlocked ? 'cursor-not-allowed' : ''
            }`}
            onClick={onNewSession}
            disabled={!currentUser || !sessionId || isUserBlocked}
          >
            <Plus size={16} style={{ marginRight: '8px' }} />
            New Session
          </button>
        </div>

        <div className="sidebar-messages">
          {userMessages.length === 0 ? (
            <div className="empty-message">
              No messages yet.
              <br />
              Start a conversation!
            </div>
          ) : (
            userMessages.map((message) => (
              <div
                key={message.id}
                className="message-wrapper"
                onMouseEnter={() => setHoveredMessage(message.id)}
                onMouseLeave={() => setHoveredMessage(null)}
              >
                <button
                  className={`message-button ${
                    hoveredMessage === message.id ? 'hovered' : ''
                  }`}
                  onClick={() => onScrollToMessage(message.id)}
                >
                  <MessageSquare size={16} className="message-icon" />
                  <span className="message-text">
                    {truncateText(message.content || message.text)}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button className="footer-button" onClick={() => navigate('/privacy')}>
            <Shield size={16} className="footer-icon" />
            <span>Privacy Policy</span>
          </button>
          <button className="footer-button" onClick={() => navigate('/chat-guide')}>
            <BookOpen size={16} className="footer-icon" />
            <span>Chat Guide</span>
          </button>
          <button className="footer-button" onClick={() => navigate('/about')}>
            <Info size={16} className="footer-icon" />
            <span>About Us</span>
          </button>
        </div>
      </div>
    </>
  );
};

// BlockedNotification Component
const BlockedNotification = ({ blockInfo, remainingTime }) => {
  if (!blockInfo) return null;

  return (
    <div className="bg-red-100/80 border border-red-300/50 rounded-lg p-2 mb-3 mx-4">
      <div className="flex items-center mb-1">
        <svg className="w-4 h-4 text-red-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-xs font-medium text-red-700">Access Restricted</span>
      </div>
      <p className="text-xs text-red-700">
        {blockInfo.reason || 'Chat is temporarily blocked for your safety.'}
        {remainingTime && (
          <><br />Restores in: {remainingTime}</>
        )}
      </p>
    </div>
  );
};

// ChatArea Component
const ChatArea = ({ 
  messages, 
  onSendMessage, 
  sidebarCollapsed, 
  scrollToMessageId,
  isTyping,
  input,
  onInputChange,
  isInputDisabled,
  messagesEndRef,
  isUserBlocked,
  blockInfo,
  remainingTime,
  typingMessage,
  isAnimatingTyping
}) => {
  const textareaRef = useRef(null);
  const messageRefs = useRef({});
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      messageElement.style.backgroundColor = '#fef3c7';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  useEffect(() => {
    if (scrollToMessageId) {
      setTimeout(() => scrollToMessage(scrollToMessageId), 100);
    } else {
      scrollToBottom();
    }
  }, [messages, scrollToMessageId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isInputDisabled) return;
    onSendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  return (
    <div className="chat-area">
      {/* Add typing animation styles */}
      <style jsx>{`
        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background-color: #374151;
          margin-left: 2px;
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .typing-animation {
          position: relative;
        }
      `}</style>
      
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <img
            src="/src/components/Lumaya.png"
            alt="Lumaya"
            className="header-logo"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.includes('/src/components/')) {
                img.src = './Lumaya.png';
              } else if (img.src.includes('./Lumaya.png')) {
                img.src = '/Lumaya.png';
              } else {
                img.style.display = 'none';
                img.nextElementSibling?.classList.remove('hidden');
              }
            }}
          />
          <h1 className="header-title hidden" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
            Lumaya
          </h1>
        </div>
      </div>

      {/* Blocked Notification */}
      {isUserBlocked && (
        <BlockedNotification blockInfo={blockInfo} remainingTime={remainingTime} />
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-box">
              <div className="empty-icon">
                <MessageSquare className="icon-white" />
              </div>
              <h2 className="empty-title">How can I help you today?</h2>
              <p className="empty-subtitle">Start a conversation by typing a message below.</p>
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message) => (
              <div
                key={message.id}
                ref={(el) => {
                  if (el) messageRefs.current[message.id] = el;
                }}
                className="message-item"
              >
                <MessageBubble message={message} />
              </div>
            ))}
            {/* Typing Animation - Show either loading dots or typing message */}
            {(isTyping || isAnimatingTyping) && (
              <div className="message-item">
                <div className="message-bubble-wrapper">
                  <div className="message-bubble-container justify-start">
                    <div className="message-bubble-inner mr-auto">
                      {isTyping && !isAnimatingTyping ? (
                        <div className="message-loading-bubble">
                          <LoadingDots />
                        </div>
                      ) : isAnimatingTyping && typingMessage ? (
                        <div className="message-bubble bot typing-animation">
                          <p className="message-content">
                            {typingMessage}
                            <span className="typing-cursor"></span>
                          </p>
                        </div>
                      ) : (
                        <div className="message-loading-bubble">
                          <LoadingDots />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="chat-input-container">
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
              {remainingTime && (
                <span className="text-xs text-red-600 font-medium">
                  {remainingTime} remaining
                </span>
              )}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isUserBlocked 
                  ? "Access temporarily limited..." 
                  : "Message Lumaya..."
              }
              disabled={isInputDisabled}
              className={`chat-textarea ${isInputDisabled ? 'disabled' : ''}`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isInputDisabled}
              className={`send-button ${!input.trim() || isInputDisabled ? 'disabled' : ''}`}
              onMouseEnter={(e) => {
                if (!isInputDisabled && input.trim()) {
                  e.currentTarget.style.backgroundColor = '#ffcc33';
                }
              }}
              onMouseLeave={(e) => {
                if (!isInputDisabled && input.trim()) {
                  e.currentTarget.style.backgroundColor = '#ffd672';
                }
              }}
            >
              {isTyping ? (
                <Square className="icon" />
              ) : (
                <Send className="icon" fill="currentColor" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main ChatInterface Component
const ChatInterface = ({ user: propUser }) => {
  const { showSuccess, showError } = useToast();
  
  const { 
    sessionId, 
    currentUser, 
    hasInitialized, 
    setHasInitialized, 
    handleRefreshSession 
  } = useSession(propUser, showError, showSuccess);
  
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState();
  const [remainingTime, setRemainingTime] = useState(null);

  // Nudge timer management
  useEffect(() => {
    if (!sessionId) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if ((lastMessage.sender === 'ai' || lastMessage.role === 'assistant') && lastMessage.type !== 'nudge') {
        if (!isSendingNudge && !isUserBlocked && !isAnimatingTyping) {
          startInactivityTimer();
        } else {
          clearInactivityTimer();
        }
      } else if (lastMessage.sender === 'user' || lastMessage.role === 'user') {
        clearInactivityTimer();
      } else if ((lastMessage.sender === 'ai' || lastMessage.role === 'assistant') && lastMessage.type === 'nudge') {
        clearInactivityTimer();
      }
    } else {
      clearInactivityTimer();
    }
    
    return () => {
      clearInactivityTimer();
    };
  }, [messages, sessionId, isSendingNudge, isUserBlocked, isAnimatingTyping, startInactivityTimer, clearInactivityTimer]);

  // Block expiry management
  useEffect(() => {
    if (!isUserBlocked || !blockInfo?.blockExpiresAt) return;

    const expiresAt = new Date(blockInfo.blockExpiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry <= 0) {
      if (checkBlockExpiry()) {
        showSuccess('Access has been restored. You can now send messages again.');
      }
      return;
    }

    const timeout = setTimeout(() => {
      if (checkBlockExpiry()) {
        showSuccess('Access has been restored. You can now send messages again.');
      }
    }, timeUntilExpiry);

    return () => clearTimeout(timeout);
  }, [isUserBlocked, blockInfo?.blockExpiresAt, checkBlockExpiry, showSuccess]);
  
  // Remaining time countdown
  useEffect(() => {
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
        return false;
      }
      
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
      const newTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      setRemainingTime(newTime);
      return true;
    };

    if (!updateRemainingTime()) return;

    const interval = setInterval(() => {
      if (!updateRemainingTime()) {
        clearInterval(interval);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isUserBlocked, blockInfo?.blockExpiresAt]);

  const handleFullRefresh = async () => {
    if (await handleRefreshSession()) {
      clearMessages();
    }
  };

  const scrollToMessage = (messageId) => {
    setScrollToMessageId(messageId);
  };

  const isInputDisabled = isTyping || isSendingNudge || isUserBlocked;

  return (
    <div className="chat-interface">
      <Sidebar
        messages={messages}
        onNewSession={handleFullRefresh}
        onScrollToMessage={scrollToMessage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser}
        sessionId={sessionId}
        isUserBlocked={isUserBlocked}
      />
      <ChatArea
        messages={messages}
        onSendMessage={handleSend}
        sidebarCollapsed={sidebarCollapsed}
        scrollToMessageId={scrollToMessageId}
        isTyping={isTyping}
        input={input}
        onInputChange={handleInputChange}
        isInputDisabled={isInputDisabled}
        messagesEndRef={messagesEndRef}
        isUserBlocked={isUserBlocked}
        blockInfo={blockInfo}
        remainingTime={remainingTime}
        typingMessage={typingMessage}
        isAnimatingTyping={isAnimatingTyping}
      />
    </div>
  );
};

export default ChatInterface;