import { GoogleGenerativeAI } from '@google/generative-ai';
import { config, initializeConfig } from '../config/index.js';

// Ensure the configuration is loaded before using it
await initializeConfig();

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export class JournalService {
    /**
     * Get personalized initial prompt based on user's history
     */
    static async getInitialPrompt(supabaseClient, userId) {
        // Configuration constants
        const PROMPT_CONFIG = {
            MAX_RECENT_ENTRIES: 5,
            MIN_PROMPT_LENGTH: 10,
            MAX_PROMPT_LENGTH: 300,
            AI_RETRY_ATTEMPTS: 2,
            AI_RETRY_DELAY: 1000,
            DAYS_THRESHOLDS: {
                FREQUENT: 0,
                RECENT: 3,
                MODERATE: 7,
                LONG_ABSENCE: 14
            }
        };

        const FALLBACK_PROMPTS = {
            new_user: [
                "Welcome to your journal. What's been on your mind today?",
                "Hello! How are you feeling right now? What would you like to explore today?",
                "Good to see you again. What experiences or thoughts would you like to reflect on today?"
            ],
            frequent_journaler: [
                "You've been journaling consistently - what's emerging for you today?",
                "Welcome back to your daily reflection. What's calling your attention today?",
                "Your regular journaling practice continues. What would you like to explore today?"
            ],
            returning_user: [
                "Welcome back to your personal space. What's happening in your world that you'd like to write about?",
                "It's good to have you back. What thoughts or feelings are you carrying today?",
                "Welcome back to your reflection practice. What's on your mind today?"
            ]
        };

        // Helper function to get fallback prompt
        const getFallbackPrompt = (userType) => {
            const prompts = FALLBACK_PROMPTS[userType] || FALLBACK_PROMPTS.new_user;
            return prompts[Math.floor(Math.random() * prompts.length)];
        };

        // Helper function to analyze mood pattern
        const analyzeMoodPattern = (moods) => {
            if (moods.length === 0) return 'neutral';

            const moodScores = moods.map(mood => {
                const positive = ['happy', 'excited', 'grateful', 'content', 'peaceful'];
                const negative = ['sad', 'anxious', 'angry', 'frustrated', 'overwhelmed'];

                if (positive.includes(mood.toLowerCase())) return 1;
                if (negative.includes(mood.toLowerCase())) return -1;
                return 0;
            });

            const avgScore = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;

            if (avgScore > 0.3) return 'positive';
            if (avgScore < -0.3) return 'challenging';
            return 'mixed';
        };

        // Helper function to analyze journaling pattern
        const analyzeJournalingPattern = (entries) => {
            if (entries.length < 2) return 'new';

            const dates = entries.map(entry => new Date(entry.created_at));
            const intervals = [];

            for (let i = 0; i < dates.length - 1; i++) {
                const daysBetween = Math.floor((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
                intervals.push(daysBetween);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            if (avgInterval <= 2) return 'frequent';
            if (avgInterval <= 7) return 'regular';
            return 'sporadic';
        };

        // Helper function to determine user type
        const determineUserType = (daysSinceLastEntry, entryCount) => {
            if (entryCount === 0) return 'new_user';
            if (daysSinceLastEntry <= PROMPT_CONFIG.DAYS_THRESHOLDS.FREQUENT) return 'frequent_journaler';
            if (daysSinceLastEntry <= PROMPT_CONFIG.DAYS_THRESHOLDS.MODERATE) return 'returning_user';
            return 'returning_user';
        };

        // Helper function to validate prompt
        const validatePrompt = (prompt) => {
            return prompt &&
                prompt.length >= PROMPT_CONFIG.MIN_PROMPT_LENGTH &&
                prompt.length <= PROMPT_CONFIG.MAX_PROMPT_LENGTH &&
                !prompt.includes('```') && // No code blocks
                !prompt.toLowerCase().includes('i cannot') && // No refusals
                prompt.trim().length > 0;
        };

        // Helper function to build system prompt
        const buildSystemPrompt = (userContext) => {
            const { daysSinceLastEntry, moodPattern, journalingPattern, hasRecentPatterns } = userContext;

            let promptContext = `Create a warm, personalized journal prompt (1-2 sentences) for a user who:
- Last journaled ${daysSinceLastEntry} days ago
- Has a ${journalingPattern} journaling pattern
- Recent mood trend: ${moodPattern}`;

            if (hasRecentPatterns) {
                promptContext += `
- Has been tracking personal patterns and insights`;
            }

            promptContext += `

Guidelines:
- Be warm and encouraging
- Reference their journaling consistency appropriately
- Don't mention specific personal details
- Keep it forward-looking and supportive
- Generate only the prompt text, nothing else

Tone based on recent absence:`;

            if (daysSinceLastEntry <= PROMPT_CONFIG.DAYS_THRESHOLDS.FREQUENT) {
                promptContext += ` Acknowledge their regular practice`;
            } else if (daysSinceLastEntry <= PROMPT_CONFIG.DAYS_THRESHOLDS.RECENT) {
                promptContext += ` Welcome them back warmly`;
            } else if (daysSinceLastEntry <= PROMPT_CONFIG.DAYS_THRESHOLDS.MODERATE) {
                promptContext += ` Gently acknowledge the gap, be encouraging`;
            } else {
                promptContext += ` Warmly welcome them back after time away`;
            }

            return promptContext;
        };

        // Helper function for delay
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Main function logic
        try {
            console.log(`[PromptGenerator] Starting for user: ${userId}`);

            // Fetch recent entries
            const { data: recentEntries, error } = await supabaseClient
                .from('journal_entries')
                .select('mood, patterns, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(PROMPT_CONFIG.MAX_RECENT_ENTRIES);

            if (error) {
                console.error('[PromptGenerator] Database error:', error.message);
                return getFallbackPrompt('new_user');
            }

            // If no recent entries, return new user prompt
            if (!recentEntries || recentEntries.length === 0) {
                return getFallbackPrompt('new_user');
            }

            // Analyze user context
            const lastEntry = recentEntries[0];
            const daysSinceLastEntry = Math.floor(
                (new Date() - new Date(lastEntry.created_at)) / (1000 * 60 * 60 * 24)
            );

            const moods = recentEntries.map(entry => entry.mood).filter(Boolean);
            const moodPattern = analyzeMoodPattern(moods);
            const journalingPattern = analyzeJournalingPattern(recentEntries);
            const userType = determineUserType(daysSinceLastEntry, recentEntries.length);

            const userContext = {
                daysSinceLastEntry,
                moodPattern,
                journalingPattern,
                userType,
                entryCount: recentEntries.length,
                hasRecentPatterns: recentEntries.some(entry => entry.patterns)
            };

            console.log(`[PromptGenerator] User context:`, userContext);

            // Try to generate AI prompt with retry
            for (let attempt = 1; attempt <= PROMPT_CONFIG.AI_RETRY_ATTEMPTS; attempt++) {
                try {
                    console.log(`[PromptGenerator] AI attempt ${attempt}/${PROMPT_CONFIG.AI_RETRY_ATTEMPTS}`);

                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const systemPrompt = buildSystemPrompt(userContext);

                    const result = await model.generateContent(systemPrompt);
                    const response = await result.response;
                    const aiPrompt = response.text().trim();

                    if (validatePrompt(aiPrompt)) {
                        console.log(`[PromptGenerator] Success: AI-generated prompt`);
                        return aiPrompt;
                    }
                } catch (error) {
                    console.error(`[PromptGenerator] AI attempt ${attempt} failed:`, error.message);

                    if (attempt < PROMPT_CONFIG.AI_RETRY_ATTEMPTS) {
                        await delay(PROMPT_CONFIG.AI_RETRY_DELAY);
                    }
                }
            }

            // Intelligent fallback based on context
            console.log(`[PromptGenerator] Using intelligent fallback for ${userType}`);

            if (daysSinceLastEntry > PROMPT_CONFIG.DAYS_THRESHOLDS.LONG_ABSENCE) {
                return "Welcome back to your journaling practice. What's been happening in your world that you'd like to reflect on?";
            }

            if (moodPattern === 'challenging') {
                return "Welcome to your safe space for reflection. What's on your heart today that you'd like to explore?";
            }

            return getFallbackPrompt(userType);

        } catch (error) {
            console.error('[PromptGenerator] Error:', error.message);
            return getFallbackPrompt('new_user');
        }
    }

    /**
     * Process journal entry with AI response and conversation context
     */
    static async processEntry(supabaseClient, userId, entry, conversationContext = [], sessionDate = null) {
        try {
            // Analyze the entry for mood and patterns
            const analysis = await this.analyzeEntry(entry, conversationContext);

            // Generate AI response and next prompt
            const aiResponse = await this.generateAIResponse(entry, conversationContext, analysis);

            // Save the journal entry to database
            const savedEntry = await this.saveEntry(supabaseClient, userId, entry, analysis, sessionDate);

            return {
                response: aiResponse.response,
                nextPrompt: aiResponse.nextPrompt,
                entryId: savedEntry.id,
                analysis: analysis
            };
        } catch (error) {
            console.error('Error processing journal entry:', error);
            throw new Error('Failed to process journal entry');
        }
    }

    /**
     * Analyze journal entry for mood, emotions, and patterns using Gemini
     */
    static async analyzeEntry(entry, conversationContext = []) {
        try {
            console.log('[analyzeEntry] Starting entry analysis');
            console.log('[analyzeEntry] Entry content:', entry);
            console.log('[analyzeEntry] Conversation context length:', conversationContext.length);

            if (conversationContext.length > 0) {
                console.log('[analyzeEntry] Conversation context:', JSON.stringify(conversationContext, null, 2));
            }

            // Create context from conversation history
            const contextText = conversationContext
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            console.log('[analyzeEntry] Formatted context text:', contextText);

            const analysisPrompt = `
    Analyze this journal entry and conversation context for emotional content, mood, and patterns.
    
    Conversation Context:
    ${contextText}
    
    Current Entry: "${entry}"
    
    Please provide analysis in the following JSON format:
    {
      "mood": "positive|negative|neutral|mixed",
      "moodScore": <number between -10 and 10>,
      "emotions": ["emotion1", "emotion2", ...],
      "themes": ["theme1", "theme2", ...],
      "patterns": ["pattern1", "pattern2", ...],
      "insight": "Brief insight about the user's emotional state or patterns",
      "keyWords": ["word1", "word2", ...]
    }
    
    Focus on being empathetic and constructive in your analysis.
  `;

            console.log('[analyzeEntry] Generated analysis prompt');
            console.log('[analyzeEntry] Analysis prompt length:', analysisPrompt.length);

            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const chat = model.startChat({
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024,
                },
                systemInstruction: {
                    role: "system",
                    parts: [{ text: "You are an empathetic AI therapist analyzing journal entries. Provide helpful, non-judgmental insights." }]
                }
            });

            console.log('[analyzeEntry] Initialized Gemini model and chat');
            console.log('[analyzeEntry] Sending message to AI...');

            const result = await chat.sendMessage(analysisPrompt);
            const response = await result.response;
            const responseText = response.text();

            console.log('[analyzeEntry] Received AI response');
            console.log('[analyzeEntry] Raw AI response:', responseText);
            console.log('[analyzeEntry] AI response length:', responseText.length);

            // Clean the response to extract JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : responseText;

            console.log('[analyzeEntry] Extracted JSON string:', jsonString);

            const analysis = JSON.parse(jsonString);
            console.log('[analyzeEntry] Parsed analysis object:', JSON.stringify(analysis, null, 2));

            const finalAnalysis = {
                mood: analysis.mood || 'neutral',
                moodScore: Math.max(-10, Math.min(10, analysis.moodScore || 0)),
                emotions: analysis.emotions || [],
                themes: analysis.themes || [],
                patterns: analysis.patterns || [],
                insight: analysis.insight || '',
                keyWords: analysis.keyWords || []
            };

            console.log('[analyzeEntry] Final processed analysis:', JSON.stringify(finalAnalysis, null, 2));
            console.log('[analyzeEntry] Analysis completed successfully');

            return finalAnalysis;
        } catch (error) {
            console.error('[analyzeEntry] Error analyzing entry:', error);
            console.log('[analyzeEntry] Error details:', {
                message: error.message,
                stack: error.stack,
                entryContent: entry,
                contextLength: conversationContext.length
            });

            // Return default analysis if AI analysis fails
            const defaultAnalysis = {
                mood: 'neutral',
                moodScore: 0,
                emotions: [],
                themes: [],
                patterns: [],
                insight: 'Thank you for sharing your thoughts.',
                keyWords: []
            };

            console.log('[analyzeEntry] Returning default analysis due to error:', JSON.stringify(defaultAnalysis, null, 2));
            return defaultAnalysis;
        }
    }

    /**
     * Generate AI response and next prompt using Gemini
     */
    static async generateAIResponse(entry, conversationContext = [], analysis) {
        try {
            const systemPrompt = `You are a compassionate AI therapist and journaling companion. Your role is to:
      1. Provide supportive, empathetic responses to journal entries
      2. Ask thoughtful follow-up questions
      3. Help users explore their thoughts and feelings
      4. Offer gentle insights when appropriate
      5. Maintain a warm, non-judgmental tone
      
      Current mood analysis: ${analysis.mood} (score: ${analysis.moodScore})
      Key emotions: ${analysis.emotions.join(', ')}
      Insight: ${analysis.insight}
      
      Keep responses conversational, supportive, and around 2-3 sentences.`;

            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            // Format conversation history for Gemini
            const formattedHistory = conversationContext.length > 0 ?
                conversationContext.map(msg => ({
                    role: msg.role === "assistant" ? "model" : msg.role,
                    parts: [{ text: msg.content }]
                })) : [];

            const chat = model.startChat({
                history: formattedHistory,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 200,
                },
                systemInstruction: {
                    role: "system",
                    parts: [{ text: systemPrompt }]
                }
            });

            const result = await chat.sendMessage(entry);
            const response = await result.response;
            const aiResponse = response.text();

            // Generate next prompt
            const nextPrompt = await this.generateNextPrompt(analysis, conversationContext);

            return {
                response: aiResponse,
                nextPrompt: nextPrompt
            };
        } catch (error) {
            console.error('Error generating AI response:', error);
            return {
                response: "Thank you for sharing that with me. Your thoughts and feelings are valid and important.",
                nextPrompt: "What else would you like to explore or reflect on today?"
            };
        }
    }

    /**
     * Generate contextual next prompt
     */
    static async generateNextPrompt(analysis, conversationContext = []) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            // Get the last few messages for context
            const recentContext = conversationContext.slice(-4).map(msg =>
                `${msg.role}: ${msg.content}`
            ).join('\n');

            const prompt = `Based on the user's current emotional state and conversation, generate a thoughtful follow-up question for journaling. 

Current mood analysis:
- Mood: ${analysis.mood}
- Mood Score: ${analysis.moodScore}
- Key emotions: ${analysis.emotions.join(', ')}
- Insight: ${analysis.insight}

Recent conversation context:
${recentContext}

Generate a single, compassionate follow-up question that:
- Is empathetic and supportive
- Encourages deeper reflection
- Matches the user's current emotional state
- Is conversational and warm
- Avoids being generic or repetitive
- Is 1-2 sentences maximum

Return only the question, nothing else.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiPrompt = response.text().trim();

            return aiPrompt;

        } catch (error) {
            console.error('Error generating AI prompt:', error);

            // Fallback prompts based on mood
            const fallbackPrompts = {
                positive: "That sounds wonderful! What else is bringing you joy today?",
                negative: "I hear that you're going through a difficult time. Would you like to explore what might help you feel better?",
                mixed: "It sounds like you're experiencing some complex emotions. Which feeling stands out most to you right now?",
                neutral: "Thank you for sharing. What else is on your mind that you'd like to explore?"
            };

            return fallbackPrompts[analysis.mood] || fallbackPrompts.neutral;
        }
    }

    /**
     * Save journal entry to database
     */
    static async saveEntry(supabaseClient, userId, content, analysis, sessionDate = null) {
        try {

            const title = await this.generateTitle(content);

            const { data, error } = await supabaseClient
                .from('journal_entries')
                .insert([{
                    user_id: userId,
                    title: title,
                    content: content.trim(),
                    mood: analysis.mood,
                    mood_score: analysis.moodScore,
                    prompt_used: '', // Can be populated if you track specific prompts
                    image_url: null,
                    voice_url: null,
                    tags: analysis.themes, // Using themes as tags
                    ai_insight: analysis.insight,
                    patterns: analysis.patterns,
                    word_count: content.trim().split(/\s+/).length,
                    session_date: sessionDate || new Date().toISOString().split('T')[0]
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving journal entry:', error);
            throw new Error('Failed to save journal entry');
        }
    }

    /**
     * Generate a title from content
     */
    static async generateTitle(content) {
        try {
            console.log('Starting title generation for content:', content.substring(0, 100) + '...');

            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `Generate a concise, meaningful title for this journal entry. The title should:
- Be 3-6 words maximum
- Capture the main theme or emotion
- Be descriptive but not too specific
- Avoid generic phrases like "My Day" or "Today's Entry"

Journal entry: "${content}"

Return only the title, nothing else.`;

            console.log('Sending prompt to Gemini for title generation');
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiTitle = response.text().trim();

            console.log('Raw AI title response:', aiTitle);

            // Clean up the title (remove quotes, extra whitespace)
            const cleanTitle = aiTitle.replace(/['"]/g, '').trim();
            console.log('Cleaned title:', cleanTitle);

            // Fallback to ensure reasonable length
            const finalTitle = cleanTitle.length > 50 ? cleanTitle.substring(0, 47) + '...' : cleanTitle;
            console.log('Final title:', finalTitle);

            return finalTitle;

        } catch (error) {
            console.error('Error generating AI title:', error);
            console.log('Falling back to original title generation logic');

            // Fallback to original logic if AI fails
            const words = content.trim().split(/\s+/);
            if (words.length <= 5) {
                console.log('Content is short, returning as is:', content);
                return content;
            }

            const title = words.slice(0, 5).join(' ');
            const fallbackTitle = title.length > 50 ? title.substring(0, 47) + '...' : title + '...';
            console.log('Fallback title generated:', fallbackTitle);

            return fallbackTitle;
        }
    }

    /**
     * Get journal summary for date range using Gemini
     */
    static async getJournalSummary(supabaseClient, userId, startDate, endDate) {
        try {
            const { data: entries, error } = await supabaseClient
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!entries || entries.length === 0) {
                return {
                    summary: "No journal entries found for this date range.",
                    entryCount: 0,
                    dateRange: { start: startDate, end: endDate },
                    insights: []
                };
            }

            // Generate AI summary
            const summary = await this.generateSummary(entries);

            return {
                summary: summary.summary,
                entryCount: entries.length,
                dateRange: { start: startDate, end: endDate },
                insights: summary.insights
            };
        } catch (error) {
            console.error('Error getting journal summary:', error);
            throw new Error('Failed to get journal summary');
        }
    }

    /**
     * Generate AI summary of multiple entries using Gemini
     */
    static async generateSummary(entries) {
        try {
            const entriesText = entries.map(entry =>
                `Date: ${new Date(entry.created_at).toLocaleDateString()}\n` +
                `Mood: ${entry.mood} (${entry.mood_score})\n` +
                `Content: ${entry.content}\n` +
                `Insights: ${entry.ai_insight}\n---`
            ).join('\n\n');

            const summaryPrompt = `
        Please provide a thoughtful summary of these journal entries and key insights:
        
        ${entriesText}
        
        Please respond in JSON format:
        {
          "summary": "A comprehensive but concise summary of the entries",
          "insights": ["insight1", "insight2", "insight3"],
          "moodTrend": "improving|declining|stable|mixed",
          "keyThemes": ["theme1", "theme2", "theme3"]
        }
      `;

            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const chat = model.startChat({
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 1024,
                },
                systemInstruction: {
                    role: "system",
                    parts: [{ text: "You are an empathetic AI therapist providing journal summaries. Be constructive and supportive." }]
                }
            });

            const result = await chat.sendMessage(summaryPrompt);
            const response = await result.response;
            const responseText = response.text();

            // Clean the response to extract JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : responseText;

            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error generating summary:', error);
            return {
                summary: "Thank you for journaling consistently. Your reflections show thoughtfulness and self-awareness.",
                insights: ["Continue expressing your thoughts and feelings", "Self-reflection is a valuable practice"]
            };
        }
    }

    /**
     * Get entries for a specific date
     */
    static async getEntriesForDate(supabaseClient, userId, date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const { data, error } = await supabaseClient
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', startOfDay.toISOString())
                .lte('created_at', endOfDay.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting entries for date:', error);
            throw new Error('Failed to get entries for date');
        }
    }

    /**
     * Delete a journal entry
     */
    static async deleteEntry(supabaseClient, userId, entryId) {
        try {
            const { data, error } = await supabaseClient
                .from('journal_entries')
                .delete()
                .eq('id', entryId)
                .eq('user_id', userId)
                .select();

            if (error) throw error;

            return {
                success: data && data.length > 0
            };
        } catch (error) {
            console.error('Error deleting entry:', error);
            throw new Error('Failed to delete entry');
        }
    }

    /**
     * Get journal statistics
     */
    static async getJournalStats(supabaseClient, userId) {
        try {
            const { data: entries, error } = await supabaseClient
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!entries || entries.length === 0) {
                return {
                    totalEntries: 0,
                    streak: 0,
                    averageWordsPerEntry: 0,
                    mostActiveDay: null,
                    topEmotions: []
                };
            }

            // Calculate statistics
            const totalEntries = entries.length;
            const totalWords = entries.reduce((sum, entry) => sum + (entry.word_count || 0), 0);
            const averageWordsPerEntry = Math.round(totalWords / totalEntries);

            // Calculate streak
            const streak = this.calculateStreak(entries);

            // Find most active day
            const dayCount = {};
            entries.forEach(entry => {
                const day = new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'long' });
                dayCount[day] = (dayCount[day] || 0) + 1;
            });
            const mostActiveDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b);

            // Get top emotions from tags
            const allTags = entries.flatMap(entry => entry.tags || []);
            const tagCount = {};
            allTags.forEach(tag => {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
            const topEmotions = Object.entries(tagCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([tag]) => tag);

            return {
                totalEntries,
                streak,
                averageWordsPerEntry,
                mostActiveDay,
                topEmotions
            };
        } catch (error) {
            console.error('Error getting journal stats:', error);
            throw new Error('Failed to get journal statistics');
        }
    }

    /**
     * Calculate writing streak
     */
    static calculateStreak(entries) {
        if (!entries || entries.length === 0) return 0;

        const dates = [...new Set(entries.map(entry =>
            new Date(entry.created_at).toDateString()
        ))].sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        const today = new Date().toDateString();
        let currentDate = new Date();

        for (let i = 0; i < dates.length; i++) {
            const entryDate = new Date(dates[i]).toDateString();
            const expectedDate = currentDate.toDateString();

            if (entryDate === expectedDate) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }
}