// Enhanced ChatService with improved AI detection prevention and SOS crisis handling
import { MemoryService } from './memoryService.js';
import { generateChatResponse } from './geminiService.js';
import fetch from 'node-fetch';
import TopicAnalyzer from './topicAnalyzer.js';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CacheService } from './cacheService.js';
import { config, initializeConfig } from '../config/index.js';
import { 
  getRandomTherapistPrompt,
  
  INTRO_PROMPT,
  WELCOME_BACK_PROMPT,
  ONBOARDING_PROMPT,
  PERSONAL_CONVO_PROMPT
} from './prompts.js';

// Import our enhanced detection functions
import {
  detectTechnicalRequest,
  containsAITerm,
  refineTherapyResponse,
  preprocessUserMessage,
  humanizeTherapyResponse
} from './aiDetectionPrevention.js';

// Ensure the configuration is loaded before using it
await initializeConfig();

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

// Add a new prompt for when user doesn't provide name
const NAME_REQUEST_PROMPT = `You are a warm, empathetic therapist. The user has been chatting with you for a few messages but hasn't shared their name yet. Gently ask for their name in a natural, therapeutic way. Make it feel like a normal part of getting to know them better, not a requirement. You can also offer to suggest a name they might like to be called during sessions if they prefer not to share their real name. Keep it conversational and supportive. LIMIT YOUR RESPONSE TO 40 WORDS MAXIMUM.`;

const NAME_SUGGESTION_PROMPT = `You are a warm, empathetic therapist. The user hasn't provided their name in the conversation so far. Based on the conversation context and their communication style, suggest a friendly name that could work for them during therapy sessions. 

Consider these options based on their personality:
- If they seem playful or humorous: suggest something endearing like "my friend", "sunshine", "champ", or "buddy"
  
- If they have a sarcastic or witty communication style: you can playfully suggest something like "my witty friend", "smarty", "my sarcastic companion", or even something cheeky like "troublemaker" (but keep it affectionate)
- If they seem vulnerable or need extra care: suggest something nurturing like "dear", "sweetheart", or "my brave one"

Present the suggestion warmly and give them full control over the choice. Say something like "I've been thinking about what to call you during our sessions. Based on our chat, [SUGGESTED_NAME] feels right to me - does that work for you, or would you prefer something else? You can always share your real name if you'd like, or we can stick with whatever makes you most comfortable."

Keep it natural, caring, and give them complete autonomy over the decision. The goal is to make them feel seen and understood while moving the conversation forward. LIMIT YOUR RESPONSE TO 40 WORDS MAXIMUM.`;

function shouldIncludeNameInContext(sessionMemory, userName) {
  if (!userName) return false;
  
  // Only include name in roughly 15% of messages
  const randomChance = Math.random() < 0.5;
  
  // Count recent messages to avoid consecutive name usage
  const recentMessages = sessionMemory.chat_context
    .filter(msg => msg.role === 'assistant')
    .slice(-2); // Look at last 3 assistant messages
  
  // Check if name was used in recent messages
  const namePattern = new RegExp(`\\b${userName}\\b`, 'i');
  const nameUsedRecently = recentMessages.some(msg => 
    namePattern.test(msg.content)
  );
  
  // Only include name if random chance hits AND name wasn't used recently
  return randomChance && !nameUsedRecently;
}

export class ChatService {
  /**
   * Process user message with Redis-based crisis blocking
   */
  static async processMessage(userId, sessionId, message) {
    console.log(`📨 Processing message for User: ${userId}, Session: ${sessionId}`);
    console.log(`💬 Message Content: ${message || 'EMPTY (Auto Welcome)'}`);

    try {
      // Step 1: Try to get data from cache first
      let cachedData = CacheService.getUserData(userId, sessionId);
      let blockedStatus, crisisStatus, sessionMemory, userProfile;

      if (cachedData) {
        // Use cached data
        ({ blocked: blockedStatus, crisis: crisisStatus, sessionMemory, userProfile } = cachedData);
        console.log(`📦 Using cached data for user ${userId}`);
      } else {
        // Cache miss - fetch from Redis
        console.log(`🔍 Cache miss - fetching from Redis for user ${userId}`);
        const batchData = await MemoryService.getBatchUserData(userId, sessionId);
        blockedStatus = batchData.blocked;
        crisisStatus = batchData.crisis;
        sessionMemory = batchData.sessionMemory;
        userProfile = batchData.userProfile;
        
        // Cache the fetched data
        CacheService.setUserData(userId, sessionId, {
          blocked: blockedStatus,
          crisis: crisisStatus,
          sessionMemory,
          userProfile
        });
      }

      // Step 2: Handle blocked users (and invalidate cache if blocked)
      if (blockedStatus) {
        console.log(`🚫 User ${userId} is blocked due to previous SOS crisis`);
        
        // Invalidate cache since user is blocked
        CacheService.invalidateCrisisStatus(userId);
        
        const blockedResponse = `I'm still concerned about your wellbeing. Please contact the crisis resources I shared earlier:

• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• Emergency Services: 911

Your safety is the priority right now. Please reach out to professional crisis counselors.

🕒 This restriction will automatically lift in ${Math.ceil(blockedStatus.timeRemaining / 3600)} hours.`;

        return {
          response: blockedResponse,
          context: [],
          userBlocked: true,
          blockReason: 'SOS_CRISIS_CONTINUED',
          crisisTimestamp: crisisStatus?.crisisTimestamp,
          timeRemaining: blockedStatus.timeRemaining,
          expiresAt: blockedStatus.expiresAt
        };
      }

      // Step 3: Check for SOS/Technical requests
      if (message && message.trim() !== '') {
        const preprocessResult = await preprocessUserMessage(message, genAI);
        
        // Handle SOS situations
        if (preprocessResult.intent === 'SELF_HARM_INTENT') {
          console.log('🚨 SOS Crisis detected - invalidating cache and blocking user');
          
          // Invalidate cache immediately when crisis is detected
          CacheService.invalidateCrisisStatus(userId);
          
          // Mark user in crisis
          const crisisInfo = await MemoryService.markUserInCrisis(userId, {
            message: message,
            sessionId: sessionId,
            detectedKeywords: preprocessResult.keywords || []
          });
          
          // Continue with existing SOS logic...
          let currentSessionMemory = sessionMemory;
          if (!currentSessionMemory || !currentSessionMemory.chat_context) {
            currentSessionMemory = {
              session_id: sessionId,
              user_id: userId,
              chat_context: []
            };
          }
          
          const updatedContext = [
            ...((currentSessionMemory.chat_context) || []),
            {
              role: 'user',
              content: message,
              timestamp: new Date().toISOString()
            },
            {
              role: 'assistant',
              content: preprocessResult.response,
              timestamp: new Date().toISOString(),
              type: 'crisis_response'
            }
          ];
          
          await MemoryService.saveSessionMemory(sessionId, userId, updatedContext);
          
          return {
            response: preprocessResult.response,
            context: updatedContext,
            userBlocked: true,
            blockReason: 'SOS_CRISIS',
            crisisInfo: crisisInfo,
            autoUnblockIn: '24 hours',
            blockExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
        }
        
        // Handle technical requests
        if (preprocessResult.shouldBlock) {
          console.log('Technical request blocked - returning therapy deflection');
          
          let currentSessionMemory = sessionMemory;
          if (!currentSessionMemory || !currentSessionMemory.chat_context) {
            currentSessionMemory = {
              session_id: sessionId,
              user_id: userId,
              chat_context: []
            };
          }
          
          currentSessionMemory.chat_context.push({
            role: 'user',
            content: message
          });
          
          currentSessionMemory.chat_context.push({
            role: 'assistant',
            content: preprocessResult.response
          });
          
          // Update both Redis and cache
          await MemoryService.saveSessionMemory(sessionId, userId, currentSessionMemory.chat_context);
          CacheService.updateSessionContext(userId, sessionId, currentSessionMemory.chat_context);
          
          return {
            response: preprocessResult.response,
            context: currentSessionMemory.chat_context
          };
        }
      }

      // Step 4: Continue with normal conversation flow
      console.log(message);
      
      // Handle debug deletion
      if(message=='1236') {
        await MemoryService.deleteUserProfile(userId); 
        CacheService.invalidateUserProfile(userId); // Invalidate cache
        console.log('delete session cleared');
      }
      
      // Continue with existing logic using sessionMemory and userProfile from cache/fetch
      let currentSessionMemory = sessionMemory;
      let isFirstInteraction = false;
      let isOnboarding = false;
      let isWelcomeBack = false;
      let isAutoWelcome = !message || message.trim() === '';
      let isNameRequest = false;
      let isNameSuggestion = false;
      let customPrompt = getRandomTherapistPrompt();
      let userName = null;

      // Check if this is a brand new user with no history
      if (!currentSessionMemory || !currentSessionMemory.chat_context) {
        console.log(`Creating new session memory for Session: ${sessionId}`);
        currentSessionMemory = {
          session_id: sessionId,
          user_id: userId,
          chat_context: []
        };
      }
        
      // Enhanced logic for handling users without names
      if (!userProfile || !userProfile.name) {
        const messageCount = currentSessionMemory.chat_context.filter(msg => msg.role === 'user').length;
        
        if (messageCount === 0) {
          // First interaction - use intro prompt
          isFirstInteraction = true;
          customPrompt = INTRO_PROMPT;
          console.log('First interaction detected, using introduction prompt');
        } else if (messageCount >= 1 && messageCount <= 1) {
          // 2nd to 4th message - gently ask for name
          isNameRequest = true;
          customPrompt = NAME_REQUEST_PROMPT;
          console.log(`Name request prompt (message ${messageCount + 1})`);
        } else if (messageCount >= 2) {
          // 5th message or more - suggest a name or proceed without
          isNameSuggestion = true;
          customPrompt = NAME_SUGGESTION_PROMPT;
          console.log(`Name suggestion prompt (message ${messageCount + 1})`);
        }
      }
      // Check if we're in the onboarding phase
      else if (userProfile && userProfile.name && !userProfile.onboardingComplete && isAutoWelcome) {
        isOnboarding = true;
        isWelcomeBack = true;
        userName = userProfile.name;
        customPrompt = WELCOME_BACK_PROMPT.replace('{userName}', userName);
        console.log(`Welcome back trigger for returning user ${userName}`);
      } 
      else if(userProfile && userProfile.name && !userProfile.onboardingComplete) {
        isOnboarding = true;
        userName = userProfile.name;
        customPrompt = ONBOARDING_PROMPT;
        console.log(`Onboarding phase for user ${userName}`);
      } 
      // If user has a complete profile, use personalized prompt
      else if (userProfile && userProfile.name && userProfile.onboardingComplete) {
        userName = userProfile.name;
        
        if (isAutoWelcome) {
          isWelcomeBack = true;
          customPrompt = WELCOME_BACK_PROMPT.replace('{userName}', userName);
          console.log(`Welcome back trigger for returning user ${userName}`);
        } else {
          customPrompt = getRandomTherapistPrompt();
          console.log(`Personalized conversation for returning user ${userName}`);
        }
      }

      console.log(`Current Chat Context Length: ${currentSessionMemory.chat_context.length}`);

      // Continue with existing memory querying and response generation...
      let relevantMemories = [];
      let relevantContext = '';
      
      if (!isFirstInteraction && !isOnboarding && !isWelcomeBack && !isAutoWelcome && !isNameRequest && !isNameSuggestion) {
        console.log(`Querying Long-Term Memory for User: ${userId}`);
        relevantMemories = await MemoryService.queryLongTermMemory(userId, message);
        console.log(`Found ${relevantMemories.length} Relevant Memories`);
        relevantContext = this.formatContextFromMemories(relevantMemories);
      }

      // Build context with memories and user profile
      let contextWithMemories = [...currentSessionMemory.chat_context];
      if (relevantContext) {
        console.log(`Adding Relevant Memory Context: ${relevantContext}`);
        contextWithMemories.unshift({
          role: 'user',
          content: `Relevant past information: ${relevantContext}`
        });
      }

      // Enhanced user profile handling
      if (userName) {
        // Always include name for auto welcome, otherwise use the existing logic
        const shouldIncludeName = isAutoWelcome ? true : shouldIncludeNameInContext(currentSessionMemory, userName);

        let userInfo = '';
        let profileSummary = '';

        if (shouldIncludeName) {
          userInfo = `[CRITICAL CLIENT INFORMATION]
The client's name is: ${userName}. Use their name sometimes (30 percent) in your responses. Use their name once in your response in a natural way.`;
          console.log(`Including instruction to use ${userName}'s name in this response${isAutoWelcome ? ' (auto welcome)' : ''}`);

          if (userProfile.onboardingSummary) {
            profileSummary = `

[CLIENT PROFILE - ESSENTIAL CONTEXT]
${userProfile.onboardingSummary}

[INSTRUCTIONS FOR USING PROFILE DATA]
- Reference specific details from this profile in your responses
- Tailor your therapeutic approach based on the client's background
- Remember their history and previous challenges
- Use this information to personalize your support
- Show you remember who they are through subtle references`;
          }
        } else {
          console.log(`Excluding name usage for this response`);
          userInfo = `[CRITICAL CLIENT INFORMATION]
DO NOT use their name ${userName} in this response anywhere unless specifically asked for it like do you remember my name. The client's name is: ${userName}.`;
          if (userProfile.onboardingSummary) {
            profileSummary = `

[CLIENT PROFILE - ESSENTIAL CONTEXT]
${userProfile.onboardingSummary}

[INSTRUCTIONS FOR USING PROFILE DATA]
- DO NOT use their name ${userName} in this response
- Reference specific details from this profile in your responses
- Tailor your therapeutic approach based on the client's background
- Remember their history and previous challenges
- Use this information to personalize your support
- Show you remember who they are through subtle references`;
          }
        }

        contextWithMemories.unshift({
          role: 'user',
          content: userInfo + profileSummary
        });
      }

      // Generate response
      console.log(`Generating response...`);
      const userMessage = isAutoWelcome ? '' : message;
      
      const response = await generateChatResponse(
        userMessage,
        contextWithMemories,
        customPrompt
      );
      
      // Only add user message to context if it's not an auto welcome
      if (!isAutoWelcome) {
        currentSessionMemory.chat_context.push({
          role: 'user',
          content: message
        });
      }
      if (isAutoWelcome) {
        currentSessionMemory.chat_context.push({
          role: 'user',
          content: 'this is auto generated message. User did not type this. '
        });
      }
      
      let processedResponse = response;
      console.log(`Initial Response: ${response}`);
      
      // Check for AI terms and refine if needed
      const check = containsAITerm(response);
      if (check.found) {
        console.log(`AI identifying term "${check.keyword}" found in response. Refining...`);
        processedResponse = await refineTherapyResponse(response, genAI);
        console.log(`Refined Response: ${processedResponse}`);
      } else {
        console.log('No AI identifying terms found in response.');
      }

      // Apply therapy-specific humanization
      console.log('Applying therapy-specific humanization...');
      const finalResponse = await humanizeTherapyResponse(processedResponse);
      console.log(`Humanized Response: ${finalResponse}`);

      // Add AI response to context
      currentSessionMemory.chat_context.push({
        role: 'assistant',
        content: finalResponse
      });
      
      // Enhanced name extraction logic
      if ((isFirstInteraction || isNameRequest || isNameSuggestion) && !userProfile) {
        const extractedName = await this.extractUserName(message, finalResponse);
        if (extractedName) {
          console.log(`Extracted user name: ${extractedName}`);
          await MemoryService.saveUserProfile(userId, {
            name: extractedName,
            onboardingComplete: false,
            firstSessionDate: new Date().toISOString()
          });
          
          // Invalidate cache when profile is updated
          CacheService.invalidateUserProfile(userId);
          userName = extractedName;
        } else if (isNameSuggestion) {
          // If no name extracted during suggestion phase, create a default profile to move forward
          console.log(`No name extracted during suggestion phase, moving to onboarding with default handling`);
          await MemoryService.saveUserProfile(userId, {
            name: 'Friend', // Default name
            onboardingComplete: false,
            firstSessionDate: new Date().toISOString(),
            nameNotProvided: true // Flag to indicate user didn't provide name
          });
          
          // Invalidate cache when profile is updated
          CacheService.invalidateUserProfile(userId);
          userName = 'Friend';
        }
      }
      
      // Handle name confirmation for suggested names
      if (userProfile && userProfile.nameNotProvided && message) {
        const nameConfirmation = await this.checkNameConfirmation(message, userProfile.name);
        if (nameConfirmation.confirmed) {
          console.log(`User confirmed name: ${nameConfirmation.name}`);
          await MemoryService.updateUserProfile(userId, { 
            name: nameConfirmation.name,
            nameNotProvided: false
          });
          CacheService.invalidateUserProfile(userId);
          userName = nameConfirmation.name;
        }
      }
      
      // Handle onboarding completion
      if (isOnboarding && currentSessionMemory.chat_context.length >= 10) {
        console.log(`Marking onboarding as complete for user ${userName}`);
        const onboardingSummary = await this.generateOnboardingSummary(currentSessionMemory.chat_context, userName);
        await MemoryService.updateUserProfile(userId, { 
          onboardingComplete: true,
          onboardingSummary: onboardingSummary
        });
        
        // Invalidate cache when profile is updated
        CacheService.invalidateUserProfile(userId);
      }

      // Save session memory to Redis
      console.log(`Saving Session Memory for Session: ${sessionId}`);
      await MemoryService.saveSessionMemory(sessionId, userId, currentSessionMemory.chat_context);
      
      // Update cache with new session context
      console.log(`updating cache Memory for Session: ${sessionId}`);
      CacheService.updateSessionContext(userId, sessionId, currentSessionMemory.chat_context);

      // Handle summarization for long conversations
      if (currentSessionMemory.chat_context.length > 20 && !isAutoWelcome) {
        const isSummarizing = true;
        console.log(`Context length > 20, attempting summarization for Session: ${sessionId}`);

        const summarizedContext = await MemoryService.summarizeConversation(currentSessionMemory.chat_context);

        if (summarizedContext !== currentSessionMemory.chat_context) {
          currentSessionMemory.chat_context = summarizedContext;
          console.log(`Summarization complete. New context length: ${currentSessionMemory.chat_context.length}`);
          
          // Save and update cache with summarized context
          await MemoryService.saveSessionMemory(sessionId, userId, currentSessionMemory.chat_context);
          CacheService.updateSessionContext(userId, sessionId, currentSessionMemory.chat_context);

          if (this.shouldSaveToLongTerm(isSummarizing, message, finalResponse)) {
            console.log(`Saving summarized interaction to long-term memory for User: ${userId}`);

            // ─── Extract *only* the summary text (no "role:" prefixes) ───
            // summarization always returned an array whose first element is:
            //   { role: 'user', content: `Previous conversation summary: ${summary}` }
            // so we strip off the "Previous conversation summary: " prefix.
            const fullSummaryEntry = summarizedContext[0].content; 
            const prefix = 'Previous conversation summary: ';
            const summaryText = fullSummaryEntry.startsWith(prefix)
              ? fullSummaryEntry.slice(prefix.length)
              : fullSummaryEntry;

            // ─── Now run mood/topic analysis on just `summaryText` ───
            const mood  = await TopicAnalyzer.analyzeMood(summaryText);
            const topic = await TopicAnalyzer.analyzeTopic(summaryText);
            console.log(`Determined Mood: ${mood}, Topic: ${topic}`);

            await MemoryService.saveLongTermMemory(userId, {
              content: summaryText,    
              response: finalResponse,
              type: 'summary_interaction',
              mood: mood,
              topic: topic
            });
          }
        } else {
          console.log(`Summarization skipped or failed for Session: ${sessionId}`);
        }
      }

      return {
        response: finalResponse,
        context: currentSessionMemory.chat_context
      };
      
    } catch (error) {
      console.error('Critical Error Processing Message:', error);
      console.error('Error Details:', {
        userId,
        sessionId,
        message: message ? message.substring(0, 100) + '...' : 'EMPTY (Auto Welcome)',
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw new Error('Failed to process chat message due to an internal server error.');
    }
  }

  static formatContextFromMemories(memories) {
    console.log(`Formatting Context from ${memories ? memories.length : 0} Memories`);

    if (!memories || memories.length === 0) {
      return '';
    }

    return memories
      .map(memory => {
        const content = memory.metadata.content || "Unknown content";
        const topic = memory.metadata.topic || "general topic";
        const mood = memory.metadata.mood || "neutral mood";
        return `Previous interaction about ${topic}: ${content}: ${mood}`;
      })
      .join('\n');
  }

  static shouldSaveToLongTerm(isSummarizing, message, response) {
    return isSummarizing;
  }

  static async extractUserName(userMessage, aiResponse) {
    try {
      if (!userMessage || userMessage.trim() === '') {
        return null;
      }

      const extractPrompt = `
      Based on this conversation exchange, extract the user's first name if they shared it.
      Only return the name, nothing else. If no name is found, return "NULL".
      
      User message: "${userMessage}"
      AI response: "${aiResponse}"
      `;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(extractPrompt);
      const extractedText = result.response.text().trim();

      return extractedText === "NULL" ? null : extractedText;
    } catch (error) {
      console.error('Error extracting user name:', error);
      return null;
    }
  }

  // New method to check if user confirmed a suggested name
  static async checkNameConfirmation(userMessage, suggestedName) {
    try {
      const confirmationPrompt = `
      Analyze if the user is confirming, changing, or providing a name in response to a name suggestion.
      
      User message: "${userMessage}"
      Previously suggested name: "${suggestedName}"
      
      Return a JSON response with:
      {
        "confirmed": true/false,
        "name": "the name they want to use"
      }
      
      If they confirm the suggested name, use the suggested name.
      If they provide a different name, use that name.
      If they don't address the name topic, return confirmed: false.
      `;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(confirmationPrompt);
      const responseText = result.response.text().trim();
      
      try {
        const parsed = JSON.parse(responseText);
        return {
          confirmed: parsed.confirmed || false,
          name: parsed.name || suggestedName
        };
      } catch (parseError) {
        console.error('Error parsing name confirmation response:', parseError);
        return { confirmed: false, name: suggestedName };
      }
    } catch (error) {
      console.error('Error checking name confirmation:', error);
      return { confirmed: false, name: suggestedName };
    }
  }
  
  static async generateOnboardingSummary(chatContext, userName) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const summaryPrompt = `
    Based on this conversation, create a concise summary (150-200 words) of key information learned during their initial therapy sessions. 
    
    IMPORTANT: Include the following information if mentioned:
    1. Don't include name here
    2. Their age (exact number if mentioned)
    3. Their occupation/profession
    4. Their likely gender based on context and name
    5. Primary concerns or goals they mentioned
    6. Notable emotional patterns or challenges
    7. Important life context (relationships, family situation, etc.)
    8. Previous coping strategies they've found helpful
    9. Communication preferences or response styles they seem to prefer
    
    Format as a professional clinical summary that captures essential context for future therapeutic conversations.
    `;
    
    const conversationOnly = chatContext.filter(msg => 
      msg.role === 'user' || msg.role === 'assistant');
    
    const conversationText = conversationOnly.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
    
    try {
      const result = await model.generateContent([summaryPrompt, conversationText]);
      const summary = result.response.text();
      console.log(`Generated onboarding summary for ${userName}`);
      return summary;
    } catch (error) {
      console.error('Error generating onboarding summary:', error);
      return `${userName} - Basic information captured during onboarding.`;
    }
  }

  // Admin functions (unchanged)
  static async adminUnblockUser(userId, adminId) {
    try {
      console.log(`👤 Admin ${adminId} attempting to unblock user ${userId}`);
      
      const result = await MemoryService.unblockUser(userId, adminId);
      
      if (result.success) {
        console.log(`✅ Admin unblock successful for user ${userId}`);
        return {
          success: true,
          message: `User ${userId} has been successfully unblocked by admin ${adminId}`,
          unblockTimestamp: new Date().toISOString(),
          previousBlockInfo: result.previousBlockInfo
        };
      } else {
        console.log(`⚠️ Admin unblock failed for user ${userId}: ${result.message}`);
        return {
          success: false,
          message: result.message,
          userId: userId,
          adminId: adminId
        };
      }
    } catch (error) {
      console.error('❌ Error in admin unblock operation:', error);
      return {
        success: false,
        message: 'An error occurred while attempting to unblock the user',
        error: error.message,
        userId: userId,
        adminId: adminId
      };
    }
  }

  static async getBlockedUsersDetails() {
    try {
      const blockedUsers = await MemoryService.getAllBlockedUsers();
      
      // Get additional details for each blocked user
      const detailedUsers = await Promise.all(
        blockedUsers.map(async (user) => {
          const crisisStatus = await MemoryService.getUserCrisisStatus(user.userId);
          const userProfile = await MemoryService.getUserProfile(user.userId);
          
          return {
            ...user,
            crisisDetails: crisisStatus,
            hasProfile: !!userProfile,
            formattedTimeRemaining: this.formatTimeRemaining(user.timeRemaining)
          };
        })
      );

      return {
        success: true,
        totalBlocked: blockedUsers.length,
        users: detailedUsers,
        retrievedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting blocked users details:', error);
      return {
        success: false,
        error: error.message,
        users: []
      };
    }
  }

  /**
   * Check if a specific user is currently blocked
   */
  static async checkUserBlockStatus(userId) {
    try {
      const blockStatus = await MemoryService.isUserBlocked(userId);
      const crisisStatus = await MemoryService.getUserCrisisStatus(userId);
      
      return {
        userId,
        isBlocked: !!blockStatus,
        blockInfo: blockStatus,
        crisisInfo: crisisStatus,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Error checking block status for user ${userId}:`, error);
      return {
        userId,
        isBlocked: false,
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Utility function to format time remaining in human-readable format
   */
  static formatTimeRemaining(seconds) {
    if (seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}