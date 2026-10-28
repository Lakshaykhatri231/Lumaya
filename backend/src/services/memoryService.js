import Redis from 'ioredis';
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config, initializeConfig } from '../config/index.js';
import { CacheService } from './cacheService.js';
import TopicAnalyzer from './topicAnalyzer.js';

// Ensure config is initialized before accessing environment variables
await initializeConfig();

// Initialize Redis client
const redis = new Redis(config.redis.url);

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey, // Removed invalid 'environment' key
});

const index = pinecone.index(config.pinecone.index);


const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const REDIS_KEYS = {
  SOS_BLOCKED_USERS: 'sos:blocked:users',
  USER_CRISIS_STATUS: 'crisis:status:user',
  SESSION_MEMORY: 'chat_session',
  USER_PROFILE: 'user'
};

export class MemoryService {
  // Fixed: Now using consistent Redis keys for all data types
static async getBatchUserData(userId, sessionId) {
  const pipeline = redis.pipeline();
  pipeline.get(`${REDIS_KEYS.SOS_BLOCKED_USERS}:${userId}`); // Fixed: use correct blocked key
  pipeline.get(`chat_session:${sessionId}`); // Fixed: was `session:${sessionId}`
  pipeline.get(`user:${userId}:profile`); // Fixed: match saveUserProfile format
  
  const results = await pipeline.exec();
  
  const blocked = results[0][1] ? JSON.parse(results[0][1]) : null;
  const sessionMemory = results[1][1] ? JSON.parse(results[1][1]) : null;
  const userProfile = results[2][1] ? JSON.parse(results[2][1]) : null;
  
  let crisis = null;
  if (blocked) {
    crisis = await redis.get(`${REDIS_KEYS.USER_CRISIS_STATUS}:${userId}`); // Fixed: use correct crisis key
    crisis = crisis ? JSON.parse(crisis) : null;
  }
  
  return { blocked, crisis, sessionMemory, userProfile };
}
  // Short-term memory management (Redis)
  static async saveSessionMemory(sessionId, userId, context) {
    try {
      const sessionData = {
        session_id: sessionId,
        user_id: userId,
        chat_context: context
        // Removed the expires_in property to make it persist indefinitely
      };
      
      // Using set instead of setex to store without expiration
      await redis.set(`chat_session:${sessionId}`, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error('❌ Error saving session memory:', error);
      return false;
    }
  }
  static async getUserProfile(userId) {
    try {
      const profileKey = `user:${userId}:profile`;
      const profileData = await redis.get(profileKey);
      
      if (!profileData) {
        return null;
      }
      
      return JSON.parse(profileData);
    } catch (error) {
      console.error('Error retrieving user profile:', error);
      return null;
    }
  }
  static async saveUserProfile(userId, profileData) {
    try {
      const profileKey = `user:${userId}:profile`;
      await redis.set(profileKey, JSON.stringify(profileData));
      
      // Invalidate cache when profile is saved
      CacheService.invalidateUserProfile(userId);
      console.log(`✅ User profile saved and cache invalidated for user ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  }
  
  // Update updateUserProfile to invalidate cache
  static async updateUserProfile(userId, updatedFields) {
    try {
      const currentProfile = await this.getUserProfile(userId) || {};
      const updatedProfile = { ...currentProfile, ...updatedFields };
      const result = await this.saveUserProfile(userId, updatedProfile);
      
      if (result) {
        // Cache is already invalidated in saveUserProfile
        console.log(`✅ User profile updated and cache invalidated for user ${userId}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  // Update deleteUserProfile to invalidate cache
  static async deleteUserProfile(userId) {
    try {
      const profileKey = `user:${userId}:profile`;
      
      // Check if profile exists first
      const existingProfile = await this.getUserProfile(userId);
      
      if (!existingProfile) {
        console.log(`⚠️ No profile found for user ID: ${userId}`);
        return false;
      }
      
      // Delete the user profile from Redis
      await redis.del(profileKey);
      
      // Invalidate cache
      CacheService.invalidateUserProfile(userId);
      console.log(`✅ User profile deleted and cache invalidated for user ID: ${userId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting user profile:', error);
      return false;
    }
  }

  static async getSessionMemory(sessionId) {
    try {
      const data = await redis.get(`chat_session:${sessionId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error retrieving session memory:', error);
      return [];
    }
  }
  // Updated deleteSessionMemory method in MemoryService class
static async deleteSessionMemory(sessionId, userId = null) {
  try {
    // Get the existing session data first
    const existingSession = await this.getSessionMemory(sessionId);
    
    if (!existingSession || !existingSession.chat_context) {
      console.log(`⚠️ No session found for session ID: ${sessionId}`);
      return { success: false, summary: null };
    }

    const chatContext = existingSession.chat_context;
    const contextLength = chatContext.length;
    
    console.log(`📊 Session ${sessionId} has ${contextLength} messages before deletion`);

    let sessionSummary = null;

    // Only summarize and save if there are enough meaningful messages (at least 4 messages)
    if (userId) {
      console.log(`📝 Summarizing session ${sessionId} before deletion...`);
      
      try {
        // Summarize the entire conversation
        const summarizedContext = await this.summarizeConversation(chatContext);
        
        if (summarizedContext && summarizedContext.length > 0) {
          // Extract the summary text (remove the "Previous conversation summary: " prefix)
          const fullSummaryEntry = summarizedContext[0].content;
          const prefix = 'Previous conversation summary: ';
          const summaryText = fullSummaryEntry.startsWith(prefix)
            ? fullSummaryEntry.slice(prefix.length)
            : fullSummaryEntry;

          // Import TopicAnalyzer dynamically to avoid circular imports
          //const TopicAnalyzer = await import('./topicAnalyzer.js').then(module => module.default);
          
          // Analyze mood and topic for the summary
          const mood = await TopicAnalyzer.analyzeMood(summaryText);
          const topic = await TopicAnalyzer.analyzeTopic(summaryText);
          
          console.log(`🧠 Saving session summary to long-term memory - Mood: ${mood}, Topic: ${topic}`);
          
          // Save to long-term memory
          await this.saveLongTermMemory(userId, {
            content: summaryText,
            response: 'Session summary before deletion',
            type: 'session_deletion_summary',
            mood: mood,
            topic: topic
          });
          
          // Store the summary to return for new session creation
          sessionSummary = summaryText;
          
          console.log(`✅ Session ${sessionId} summarized and saved to long-term memory`);
        } else {
          console.log(`⚠️ Summarization failed for session ${sessionId}`);
        }
      } catch (summaryError) {
        console.error(`❌ Error during summarization for session ${sessionId}:`, summaryError);
        // Continue with deletion even if summarization fails
      }
    } else {
      console.log(`⏭️ Skipping summarization for session ${sessionId} - insufficient messages or no userId`);
    }

    // Delete the session memory from Redis
    await redis.del(`chat_session:${sessionId}`);
    
    // Invalidate cache if userId is provided
    // if (userId) {
    //   CacheService.invalidateSessionContext?.(userId, sessionId);
    // }
    
    console.log(`✅ Session memory deleted for session ID: ${sessionId}`);
    return { success: true, summary: sessionSummary };
    
  } catch (error) {
    console.error('❌ Error deleting session memory:', error);
    return { success: false, summary: null };
  }
}
  static async unblockUser(userId, adminId = null) {
    try {
      const crisisKey = `${REDIS_KEYS.USER_CRISIS_STATUS}:${userId}`;
      const blockedKey = `${REDIS_KEYS.SOS_BLOCKED_USERS}:${userId}`;
      
      // Check if user was actually blocked
      const wasBlocked = await this.isUserBlocked(userId);
      
      if (!wasBlocked) {
        console.log(`⚠️ User ${userId} was not blocked`);
        return { success: false, message: 'User was not blocked' };
      }
      
      // Remove both crisis status and blocked status
      const deleteResults = await Promise.all([
        redis.del(crisisKey),
        redis.del(blockedKey)
      ]);
      
      // Invalidate cache when user is unblocked
      CacheService.invalidateCrisisStatus(userId);
      
      const logMessage = adminId 
        ? `✅ User ${userId} manually unblocked by admin ${adminId} and cache invalidated` 
        : `✅ User ${userId} manually unblocked and cache invalidated`;
      
      console.log(logMessage);
      
      return { 
        success: true, 
        message: 'User successfully unblocked',
        previousBlockInfo: wasBlocked
      };
    } catch (error) {
      console.error('❌ Error unblocking user:', error);
      return { success: false, message: 'Error occurred while unblocking user', error: error.message };
    }
  }
  /**
   * Get all currently blocked users (admin function)
   */
  static async getAllBlockedUsers() {
    try {
      const pattern = `${REDIS_KEYS.SOS_BLOCKED_USERS}:*`;
      const keys = await redis.keys(pattern);
      
      const blockedUsers = [];
      if (keys.length > 0) {
        const values = await redis.mget(keys);
        
        for (let i = 0; i < keys.length; i++) {
          if (values[i]) {
            const userData = JSON.parse(values[i]);
            const userId = keys[i].split(':').pop();
            const timeRemaining = await redis.ttl(keys[i]);
            
            blockedUsers.push({
              userId,
              ...userData,
              timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
              expiresAt: timeRemaining > 0 
                ? new Date(Date.now() + (timeRemaining * 1000)).toISOString()
                : 'Expired'
            });
          }
        }
      }
      
      return blockedUsers;
    } catch (error) {
      console.error('❌ Error getting all blocked users:', error);
      return [];
    }
  }

  /**
   * Get blocked user statistics
   */
  static async getBlockedUserStats() {
    try {
      const blockedUsers = await this.getAllBlockedUsers();
      
      return {
        totalBlocked: blockedUsers.length,
        activeBlocks: blockedUsers.filter(user => user.timeRemaining > 0).length,
        expiredBlocks: blockedUsers.filter(user => user.timeRemaining <= 0).length,
        averageTimeRemaining: blockedUsers.length > 0 
          ? Math.round(blockedUsers.reduce((sum, user) => sum + user.timeRemaining, 0) / blockedUsers.length)
          : 0
      };
    } catch (error) {
      console.error('❌ Error getting blocked user stats:', error);
      return {
        totalBlocked: 0,
        activeBlocks: 0,
        expiredBlocks: 0,
        averageTimeRemaining: 0,
        error: error.message
      };
    }
  }

  static async summarizeConversation(context) {
    try {
      // Only summarize if there are enough messages
      
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Extract the conversation as a string
      const conversationText = context.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');
      
      // Request a summary
      const summaryPrompt = `*Task:* Summarize the following therapy conversation segment.
*Purpose:* Create a concise context summary for the AI therapist to ensure continuity in the ongoing session. This summary will replace the older messages in the conversation history.
*Instructions:*
- Focus on the *main topics* discussed (e.g., anxiety, relationship issues, work stress).
- Capture the *user's key emotional state(s)* and any significant shifts observed.
- Note *critical details, events, or figures* mentioned by the user that are central to the discussion.
- Include any specific *problems, goals, or insights* that emerged during this part of the conversation.
- Briefly mention the *therapist's main line of inquiry or support* offered.
- *Be concise but comprehensive.* Aim for significantly shorter than the original text while retaining the core therapeutic essence.
- *Format:* Use clear, narrative sentences or brief bullet points.

*Conversation Segment to Summarize:*
${conversationText}

*Concise Summary:*`; // Added a marker to encourage immediate summarization
  
      const result = await model.generateContent(summaryPrompt);
      const summary = await result.response.text();
      
      // Create a new context with the summary
      return [
        {
          role: 'user',
          content: `Previous conversation summary: ${summary}`
        },
        // Keep the last 2 exchanges (4 messages) for immediate context
        ...context.slice(-4)
      ];
    } catch (error) {
      console.error('❌ Error summarizing conversation:', error);
      return context; // Return original context if summarization fails
    }
  }

  // Long-term memory management (Pinecone)
  static async saveLongTermMemory(userId, data) {
    try {
      const vector = await this.generateEmbedding(data.content);
  
      // Wrap the vector in an array to match Pinecone's expected format
      await index.upsert([{
        id: `memory:${userId}:${Date.now()}`,
        values: vector,
        metadata: {
          user_id: userId,
          content: data.content, // Include the actual content in metadata
          response: data.response, // Include the response in metadata
          type: data.type,
          mood: data.mood,
          topic: data.topic,
          timestamp: new Date().toISOString()
        }
      }]);
  
      return true;
    } catch (error) {
      console.error('❌ Error saving long-term memory:', error);
      return false;
    }
  }

  static async queryLongTermMemory(userId, query, limit = 5) {
    try {
      const queryVector = await this.generateEmbedding(query);

      const results = await index.query({
        vector: queryVector,
        filter: { user_id: userId },
        topK: limit,
        includeMetadata: true
      });

      return results.matches;
    } catch (error) {
      console.error('❌ Error querying long-term memory:', error);
      return [];
    }
  }

  // Helper method to generate embeddings using Gemini AI
  static async generateEmbedding(text) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-exp-03-07" });
      const result = await model.embedContent(text);
      
      // Truncate embedding to match index dimensions
      return result.embedding.values.slice(0, 1024);
    } catch (error) {
      console.error("❌ Error generating embedding:", error);
      return []; // Return empty array if there's an error
    }
  }
   static async markUserInCrisis(userId, crisisData) {
    try {
      const crisisInfo = {
        userId,
        message: crisisData.message,
        sessionId: crisisData.sessionId,
        detectedKeywords: crisisData.detectedKeywords || [],
        crisisTimestamp: new Date().toISOString(),
        blockedAt: Date.now()
      };

      // Store crisis status with 24-hour expiration (86400 seconds)
      const crisisKey = `${REDIS_KEYS.USER_CRISIS_STATUS}:${userId}`;
      await redis.setex(crisisKey, 86400, JSON.stringify(crisisInfo));

      // Add to blocked users set with 24-hour expiration
      const blockedKey = `${REDIS_KEYS.SOS_BLOCKED_USERS}:${userId}`;
      await redis.setex(blockedKey, 86400, JSON.stringify({
        userId,
        blockedAt: Date.now(),
        reason: 'SOS_CRISIS',
        crisisTimestamp: crisisInfo.crisisTimestamp
      }));

      // Invalidate cache when user goes into crisis
      CacheService.invalidateCrisisStatus(userId);
      console.log(`🚨 User ${userId} marked in crisis with 24-hour auto-removal and cache invalidated`);
      
      return crisisInfo;
    } catch (error) {
      console.error('❌ Error marking user in crisis:', error);
      throw error;
    }
  }
  /**
   * Get user crisis status from Redis
   */
  static async getUserCrisisStatus(userId) {
    try {
      const crisisKey = `${REDIS_KEYS.USER_CRISIS_STATUS}:${userId}`;
      const crisisData = await redis.get(crisisKey);
      
      if (crisisData) {
        return JSON.parse(crisisData);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user crisis status:', error);
      return null;
    }
  }

  /**
   * Check if user is currently blocked due to SOS crisis
   */
  static async isUserBlocked(userId) {
    try {
      const blockedKey = `${REDIS_KEYS.SOS_BLOCKED_USERS}:${userId}`;
      const blockedData = await redis.get(blockedKey);
      
      if (blockedData) {
        const blockInfo = JSON.parse(blockedData);
        const timeRemaining = await redis.ttl(blockedKey);
        
        return {
          ...blockInfo,
          timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
          expiresAt: new Date(Date.now() + (timeRemaining * 1000)).toISOString()
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error checking if user is blocked:', error);
      return null;
    }
  }
}