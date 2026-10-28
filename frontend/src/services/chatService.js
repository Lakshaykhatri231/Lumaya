import { supabase } from '../utils/supabase1';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const sendChatMessage = async (message, sessionId) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        sessionId,
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
};

export const refreshChatSession = async (sessionId) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/api/chatbot/refresh-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing chat session:', error);
    throw error;
  }
};
export const sendNudgeMessage = async (sessionId) => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');

    console.log(`Sending nudge request for session: ${sessionId}`); // Debug log

    const response = await fetch(`${API_BASE_URL}/api/chatbot/nudge`, { // <--- NEW ENDPOINT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
       const errorBody = await response.text(); // Get more details
      console.error(`Nudge server error: ${response.status}`, errorBody); // Log details
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending nudge message:', error);
    throw error; // Re-throw to be caught by the component
  }
};