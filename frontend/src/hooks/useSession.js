import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuthStatus, getSessionId } from '../services/authService';
import { refreshChatSession } from '../services/chatService';

export const useSession = (propUser, showError, showSuccess) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(propUser);
  const [hasInitialized, setHasInitialized] = useState(false);
  const navigate = useNavigate();

  // Verify user and establish session
  useEffect(() => {
    const verifyUser = async () => {
      try {
        let userToSet = null;
        let userSessionId = null;

        if (propUser) {
          userToSet = propUser;
        } else {
          const { user } = await checkAuthStatus();
          userToSet = user;
        }

        if (userToSet) {
          setCurrentUser(userToSet);
          userSessionId = getSessionId(userToSet.id);
          if (userSessionId) {
            setSessionId(userSessionId);
          } else {
            showError("Could not establish a chat session. Please try again.");
          }
        } else {
          showError("Please sign in to use the chat.");
          navigate('/auth', { state: { from: '/chat' } });
        }
      } catch (err) {
        console.error("Error verifying user:", err);
        showError("Authentication error. Please sign in again.");
        navigate('/auth', { state: { from: '/chat' } });
      }
    };

    verifyUser();
  }, [propUser, navigate, showError]);

  // Handle session refresh
  const handleRefreshSession = useCallback(async () => {
    if (!sessionId || !currentUser) return;
    
    try {
      await refreshChatSession(sessionId);
      setHasInitialized(false);
      showSuccess('Chat session refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      showError('Failed to refresh chat session');
      return false;
    }
  }, [sessionId, currentUser, showSuccess, showError]);

  return {
    sessionId,
    currentUser,
    hasInitialized,
    setHasInitialized,
    handleRefreshSession
  };
};