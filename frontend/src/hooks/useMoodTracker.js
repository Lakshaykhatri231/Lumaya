import { useState, useCallback } from 'react';

export const useMoodTracker = (sessionId, userId) => {
  const [selectedMood, setSelectedMood] = useState(null);
  
  const trackMood = useCallback((mood) => {
    setSelectedMood(mood);
    
    // Here you could add logic to save the mood to a database or service
    // For example:
    // saveMoodToDatabase(userId, sessionId, mood, new Date());
    
    return mood;
  }, [sessionId, userId]);
  
  return {
    selectedMood,
    trackMood
  };
};