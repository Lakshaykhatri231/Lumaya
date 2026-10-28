// topicAnalyzer.js
import { config, initializeConfig } from '../config/index.js';
import fetch from 'node-fetch';
import axios from 'axios';
class TopicAnalyzer {
  /**
   * Analyzes a message to determine its topic using HuggingFace model
   * Falls back to keyword analysis if API call fails
   * @param {string} message - The message to analyze
   * @returns {string} - The detected topic
   */
  static async analyzeTopic(message) {
    console.log(`Analyzing Topic for Message: ${message ? message.substring(0, 50) + '...' : 'EMPTY'}`);
    
    // Skip topic analysis for empty messages (auto welcomes)
    if (!message || message.trim() === '') {
      return "auto-welcome";
    }
    
    try {
      // Validate input
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        console.warn('Invalid message for topic analysis');
        return this.analyzeTopicWithKeywords(message);
      }
  
      // Truncate very long messages to avoid payload issues
      const truncatedMessage = message.substring(0, 500);
  
      // HuggingFace API endpoint for inference
      const API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";
      
      // Therapy-relevant topic labels to classify against
      const candidateLabels = [
        "mental health",      // Covers anxiety, depression, grief, trauma
        "relationships",      // Covers romantic, family, friendships, identity
        "work & career",      // Covers work-stress, life-transition
        "self-esteem",        // Covers self-worth, confidence issues
        "addiction",          // Stays as it is
        "sleep issues",       // Stays as it is
        "health concerns",    // Covers health-anxiety, chronic illness stress
        "parenting",          // Stays as it is
        "loneliness",         // Stays as it is
        "existential crisis"  // Stays as it is
      ];
  
      // Prepare the request payload with more robust error checking
      const payload = {
        inputs: truncatedMessage,
        parameters: {
          candidate_labels: candidateLabels,
          multi_label: false
        }
      };
  
      // Make API call to Hugging Face with additional error handling
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.huggingface.apiKey2}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
  
      // Check response status
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Hugging Face API Error: ${response.status}`, errorBody);
        throw new Error(`Hugging Face API returned ${response.status}: ${errorBody}`);
      }
  
      const result = await response.json();
      
      // Validate result structure
      if (!result.labels || !result.scores) {
        console.warn('Unexpected API response structure');
        return this.analyzeTopicWithKeywords(message);
      }
      
      // Get the highest scoring label
      const topLabelIndex = result.scores.indexOf(Math.max(...result.scores));
      const topLabel = result.labels[topLabelIndex];
      
      // Only accept the classification if confidence is reasonable
      if (result.scores[topLabelIndex] > 0.3) {
        return topLabel;
      }
      
      // Fallback to secondary analysis for low-confidence results
      return this.analyzeTopicWithKeywords(message);
    } catch (error) {
      console.error('Error using Hugging Face for topic analysis:', 
        error.message, 
        error.response ? error.response.data : 'No additional error details'
      );
      
      // Always fall back to keyword analysis
      return this.analyzeTopicWithKeywords(message);
    }
  }

  /**
   * Fallback method using keyword matching to determine topic
   * @param {string} message - The message to analyze
   * @returns {string} - The detected topic
   */
  static analyzeTopicWithKeywords(message) {
    console.log(`Analyzing Topic with Keyword Method: ${message ? message.substring(0, 50) + '...' : 'EMPTY'}`);
    
    if (!message || message.trim() === '') {
      return "auto-welcome";
    }
    
    const messageLower = message.toLowerCase();
    
    // Topic keywords mapping
    const topicKeywords = {
      'anxiety': ['anxious', 'worry', 'nervous', 'panic', 'stress', 'overwhelm', 'fear'],
      'depression': ['depressed', 'sad', 'hopeless', 'empty', 'unmotivated', 'tired', 'despair'],
      'relationships': ['partner', 'marriage', 'boyfriend', 'girlfriend', 'family', 'friend', 'coworker'],
      'grief': ['loss', 'death', 'died', 'passed away', 'miss', 'grieving', 'mourning'],
      'trauma': ['trauma', 'ptsd', 'abuse', 'assault', 'flashback', 'nightmare', 'trigger'],
      'self-esteem': ['confidence', 'worth', 'failure', 'inadequate', 'not good enough', 'self-image'],
      'work-stress': ['job', 'career', 'workplace', 'boss', 'burnout', 'overworked', 'deadline'],
      'identity': ['identity', 'purpose', 'meaning', 'values', 'goals', 'sexuality', 'gender'],
      'addiction': ['addiction', 'substance', 'alcohol', 'drinking', 'drugs', 'gambling', 'recovery'],
      'sleep': ['insomnia', 'sleep', 'tired', 'fatigue', 'nightmare', 'rest', 'exhausted'],
      'health-anxiety': ['health', 'illness', 'disease', 'symptoms', 'doctor', 'medical', 'diagnosis'],
      'life-transition': ['change', 'transition', 'move', 'new job', 'graduation', 'retirement', 'milestone']
    };
    
    // Count keyword matches for each topic
    const topicScores = {};
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      topicScores[topic] = 0;
      keywords.forEach(keyword => {
        if (messageLower.includes(keyword)) {
          topicScores[topic]++;
        }
      });
    }
    
    // Find topic with highest score
    let maxScore = 0;
    let detectedTopic = 'general-discussion';
    
    for (const [topic, score] of Object.entries(topicScores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedTopic = topic;
      }
    }
    
    console.log(`Keyword Topic Detection Result: ${detectedTopic} (Score: ${maxScore})`);
    
    return maxScore > 0 ? detectedTopic : 'general-discussion';
  }

  /**
   * Initialize the configuration before using the analyzer
   */
  static async initialize() {
    await initializeConfig();
    console.log('TopicAnalyzer initialized');
  }
  static async analyzeMood(message) {
    console.log(`Analyzing Mood for Message: ${message ? message.substring(0, 50) + '...' : 'EMPTY'}`);
    
    // Skip mood analysis for empty messages (auto welcomes)
    if (!message || message.trim() === '') {
      return "unknown";
    }
    
    try {
      const HUGGINGFACE_MOOD_API_URL="https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base";
      console.log(`Sending Mood Analysis Request to: ${HUGGINGFACE_MOOD_API_URL}`);
      
      const response = await axios.post(
        HUGGINGFACE_MOOD_API_URL,
        { inputs: message },
        {
          headers: {
            Authorization: `Bearer ${config.huggingface.apiKey2}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Extract highest-confidence emotion
      const emotions = response.data[0];
      const highestEmotion = emotions.reduce((prev, current) =>
        prev.score > current.score ? prev : current
      );

      console.log("Mood Analysis Result:", {
        emotion: highestEmotion.label,
        confidence: highestEmotion.score
      });

      return highestEmotion.label; 
    } catch (error) {
      console.error("Mood Analysis Error:", {
        errorMessage: error.message,
        apiResponse: error.response ? error.response.data : 'No API response'
      });
      return "unknown";
    }
  }
}

export default TopicAnalyzer;