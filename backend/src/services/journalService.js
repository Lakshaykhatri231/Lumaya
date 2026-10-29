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

                    const model = genAI.getGenerativeModel({ model: config.gemini.model });
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

            // Create context from conversation history
            const contextText = conversationContext
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');


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


            const model = genAI.getGenerativeModel({ model: config.gemini.model });
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


            const result = await chat.sendMessage(analysisPrompt);
            const response = await result.response;
            const responseText = response.text();


            // Clean the response to extract JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : responseText;


            const analysis = JSON.parse(jsonString);

            const finalAnalysis = {
                mood: analysis.mood || 'neutral',
                moodScore: Math.max(-10, Math.min(10, analysis.moodScore || 0)),
                emotions: analysis.emotions || [],
                themes: analysis.themes || [],
                patterns: analysis.patterns || [],
                insight: analysis.insight || '',
                keyWords: analysis.keyWords || []
            };


            return finalAnalysis;
        } catch (error) {
            console.error('[analyzeEntry] Error analyzing entry:', error.message);

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

            const model = genAI.getGenerativeModel({ model: config.gemini.model });

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
            const model = genAI.getGenerativeModel({ model: config.gemini.model });

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
                    tags: this.normalizeTags(analysis.themes || []), // Using themes as tags
                    emotions: this.normalizeTags(analysis.emotions || []),
                    ai_insight: analysis.insight,
                    patterns: analysis.patterns || [],
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

            const model = genAI.getGenerativeModel({ model: config.gemini.model });

            const prompt = `Generate a concise, meaningful title for this journal entry. The title should:
- Be 3-6 words maximum
- Capture the main theme or emotion
- Be descriptive but not too specific
- Avoid generic phrases like "My Day" or "Today's Entry"

Journal entry: "${content}"

Return only the title, nothing else.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiTitle = response.text().trim();


            // Clean up the title (remove quotes, extra whitespace)
            const cleanTitle = aiTitle.replace(/['"]/g, '').trim();

            // Fallback to ensure reasonable length
            const finalTitle = cleanTitle.length > 50 ? cleanTitle.substring(0, 47) + '...' : cleanTitle;

            return finalTitle;

        } catch (error) {
            console.error('Error generating AI title:', error);

            // Fallback to original logic if AI fails
            const words = content.trim().split(/\s+/);
            if (words.length <= 5) {
                return content;
            }

            const title = words.slice(0, 5).join(' ');
            const fallbackTitle = title.length > 50 ? title.substring(0, 47) + '...' : title + '...';

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

            const model = genAI.getGenerativeModel({ model: config.gemini.model });
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
    static async getEntriesForDate(supabaseClient, userId, dateKey) {
        try {
            // dateKey is YYYY-MM-DD, matched against the day each entry belongs to (session_date)
            const { data, error } = await supabaseClient
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .eq('session_date', dateKey)
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
            const allTags = entries.flatMap(entry => (entry.emotions && entry.emotions.length ? entry.emotions : entry.tags) || []);
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

        const days = new Set(entries.map((entry) => this.entryDay(entry)));
        const cursor = new Date();

        // Today may not be written yet; the streak is still alive if yesterday was
        if (!days.has(this.toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);

        let streak = 0;
        while (days.has(this.toDateKey(cursor))) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        }

        return streak;
    }

    // ───────────────────────── Dates & shared helpers ─────────────────────────

    static toDateKey(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /** The day an entry belongs to: the explicit session_date, else the day it was created. */
    static entryDay(entry) {
        return entry.session_date || this.toDateKey(entry.created_at);
    }

    static countBy(values, limit = 5) {
        const counts = {};
        values.filter(Boolean).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));
    }

    static async fetchEntriesBetween(supabaseClient, userId, startDate, endDate, columns = '*') {
        const { data, error } = await supabaseClient
            .from('journal_entries')
            .select(columns)
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // ───────────────────────── Calendar ─────────────────────────

    /**
     * Days with entries in a month (YYYY-MM), for the calendar view.
     */
    static async getCalendar(supabaseClient, userId, month) {
        const [year, monthIndex] = month.split('-').map(Number);
        const first = `${month}-01`;
        const last = this.toDateKey(new Date(year, monthIndex, 0));

        const { data, error } = await supabaseClient
            .from('journal_entries')
            .select('id, session_date, created_at, mood, mood_score')
            .eq('user_id', userId)
            .gte('session_date', first)
            .lte('session_date', last)
            .order('created_at', { ascending: true });

        if (error) throw new Error('Failed to get calendar');

        const days = {};
        (data || []).forEach((entry) => {
            const day = this.entryDay(entry);
            days[day] = days[day] || { date: day, count: 0, scoreTotal: 0 };
            days[day].count += 1;
            days[day].scoreTotal += entry.mood_score || 0;
        });

        return Object.values(days).map(({ date, count, scoreTotal }) => ({
            date,
            count,
            averageMoodScore: Math.round((scoreTotal / count) * 10) / 10
        }));
    }

    // ───────────────────────── Search & tags ─────────────────────────

    static async searchEntries(supabaseClient, userId, query, startDate = null, endDate = null) {
        try {
            // Characters that have meaning inside a PostgREST filter expression
            const term = query.replace(/[%,()*\\]/g, ' ').trim();

            let request = supabaseClient
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .or(`content.ilike.%${term}%,title.ilike.%${term}%`)
                .order('created_at', { ascending: false })
                .limit(100);

            if (startDate) request = request.gte('created_at', startDate.toISOString());
            if (endDate) request = request.lte('created_at', endDate.toISOString());

            const { data, error } = await request;
            if (error) throw error;

            return { entries: data || [], totalResults: (data || []).length };
        } catch (error) {
            console.error('Error searching entries:', error.message);
            throw new Error('Failed to search entries');
        }
    }

    static normalizeTags(tags) {
        const seen = new Set();
        return tags
            .filter((t) => typeof t === 'string')
            .map((t) => t.trim().toLowerCase().slice(0, 30))
            .filter((t) => t && !seen.has(t) && seen.add(t))
            .slice(0, 20);
    }

    static async tagEntry(supabaseClient, userId, entryId, tags) {
        try {
            const cleaned = this.normalizeTags(tags);
            const { data, error } = await supabaseClient
                .from('journal_entries')
                .update({ tags: cleaned })
                .eq('id', entryId)
                .eq('user_id', userId)
                .select('tags');

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Entry not found');

            return { tags: data[0].tags };
        } catch (error) {
            console.error('Error tagging entry:', error.message);
            throw new Error('Failed to tag entry');
        }
    }

    static async getAllTags(supabaseClient, userId) {
        try {
            const { data, error } = await supabaseClient
                .from('journal_entries')
                .select('tags')
                .eq('user_id', userId);

            if (error) throw error;

            return this.countBy((data || []).flatMap((e) => e.tags || []), 200)
                .map(({ name, count }) => ({ tag: name, count }));
        } catch (error) {
            console.error('Error getting tags:', error.message);
            throw new Error('Failed to get tags');
        }
    }

    static async getEntriesByTag(supabaseClient, userId, tag, startDate = null, endDate = null) {
        try {
            const normalized = tag.trim().toLowerCase();

            let request = supabaseClient
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .contains('tags', [normalized])
                .order('created_at', { ascending: false });

            if (startDate) request = request.gte('created_at', startDate.toISOString());
            if (endDate) request = request.lte('created_at', endDate.toISOString());

            const { data, error } = await request;
            if (error) throw error;

            return { entries: data || [], tag: normalized, totalResults: (data || []).length };
        } catch (error) {
            console.error('Error getting entries by tag:', error.message);
            throw new Error('Failed to get entries by tag');
        }
    }

    // ───────────────────────── Mood, streaks, insights ─────────────────────────

    static async getMoodAnalysis(supabaseClient, userId, startDate, endDate) {
        try {
            const entries = await this.fetchEntriesBetween(supabaseClient, userId, startDate, endDate);

            if (entries.length === 0) {
                return {
                    overallMood: 'neutral',
                    moodTrend: 'stable',
                    dominantEmotions: [],
                    moodScore: 0,
                    insights: ['No entries in this period yet.'],
                    series: []
                };
            }

            const scores = entries.map((e) => e.mood_score || 0);
            const average = scores.reduce((a, b) => a + b, 0) / scores.length;

            // Trend: compare the first half of the period with the second half
            const mid = Math.floor(scores.length / 2);
            let moodTrend = 'stable';
            if (scores.length >= 4) {
                const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
                const delta = avg(scores.slice(mid)) - avg(scores.slice(0, mid));
                if (delta > 1) moodTrend = 'improving';
                else if (delta < -1) moodTrend = 'declining';
            }

            const overallMood = average > 2 ? 'positive' : average < -2 ? 'negative' : Math.abs(average) <= 0.5 ? 'neutral' : 'mixed';

            const dominantEmotions = this.countBy(
                entries.flatMap((e) => (e.emotions && e.emotions.length ? e.emotions : e.tags || [])),
                5
            );

            const byDay = {};
            entries.forEach((e) => {
                const day = this.entryDay(e);
                byDay[day] = byDay[day] || [];
                byDay[day].push(e.mood_score || 0);
            });
            const series = Object.entries(byDay).map(([date, list]) => ({
                date,
                moodScore: Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10
            }));

            const insights = [];
            if (moodTrend === 'improving') insights.push('Your mood has been trending upward during this period.');
            if (moodTrend === 'declining') insights.push('Your mood has dipped lately. Be gentle with yourself and consider talking it through.');
            if (dominantEmotions[0]) insights.push(`"${dominantEmotions[0].name}" came up most often in your entries.`);
            const best = series.reduce((a, b) => (b.moodScore > a.moodScore ? b : a));
            insights.push(`Your brightest day was ${best.date}.`);

            return {
                overallMood,
                moodTrend,
                dominantEmotions,
                moodScore: Math.round(average * 10) / 10,
                insights,
                series
            };
        } catch (error) {
            console.error('Error getting mood analysis:', error.message);
            throw new Error('Failed to get mood analysis');
        }
    }

    static async getWritingStreak(supabaseClient, userId) {
        try {
            const { data, error } = await supabaseClient
                .from('journal_entries')
                .select('session_date, created_at')
                .eq('user_id', userId);

            if (error) throw error;

            const days = [...new Set((data || []).map((e) => this.entryDay(e)))].sort();
            const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

            if (days.length === 0) {
                return { currentStreak: 0, longestStreak: 0, streakStartDate: null, nextMilestone: MILESTONES[0], totalDaysWritten: 0 };
            }

            const dayMs = 24 * 60 * 60 * 1000;
            const gap = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / dayMs);

            let longest = 1;
            let run = 1;
            for (let i = 1; i < days.length; i++) {
                run = gap(days[i - 1], days[i]) === 1 ? run + 1 : 1;
                longest = Math.max(longest, run);
            }

            // The current streak is alive if the last entry was today or yesterday
            const last = days[days.length - 1];
            const sinceLast = gap(last, this.toDateKey(new Date()));
            let currentStreak = 0;
            let streakStartDate = null;
            if (sinceLast <= 1) {
                currentStreak = 1;
                streakStartDate = last;
                for (let i = days.length - 2; i >= 0 && gap(days[i], days[i + 1]) === 1; i--) {
                    currentStreak++;
                    streakStartDate = days[i];
                }
            }

            return {
                currentStreak,
                longestStreak: longest,
                streakStartDate,
                nextMilestone: MILESTONES.find((m) => m > currentStreak) || null,
                totalDaysWritten: days.length
            };
        } catch (error) {
            console.error('Error getting writing streak:', error.message);
            throw new Error('Failed to get writing streak');
        }
    }

    static async getJournalInsights(supabaseClient, userId, timeframe = 'month') {
        try {
            const spanDays = { week: 7, month: 30, year: 365 }[timeframe] || 30;
            const end = new Date();
            const start = new Date(end.getTime() - spanDays * 24 * 60 * 60 * 1000);
            const entries = await this.fetchEntriesBetween(supabaseClient, userId, start, end);

            const totalWords = entries.reduce((sum, e) => sum + (e.word_count || 0), 0);
            const weekday = (e) => new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'long' });
            const bucket = (e) => {
                const hour = new Date(e.created_at).getHours();
                if (hour < 6) return 'night';
                if (hour < 12) return 'morning';
                if (hour < 18) return 'afternoon';
                return 'evening';
            };

            const writingTime = this.countBy(entries.map(bucket), 4);
            const mostActiveDay = this.countBy(entries.map(weekday), 1)[0]?.name || null;
            const scores = entries.map((e) => e.mood_score || 0);
            const averageScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

            const recommendations = [];
            if (entries.length === 0) {
                recommendations.push('Write your first entry. Even two sentences count.');
            } else {
                const perWeek = entries.length / (spanDays / 7);
                if (perWeek < 2) recommendations.push('Try journaling a little more often. Short, regular entries build the habit.');
                if (averageScore < -2) recommendations.push('Your entries have carried a lot of weight lately. Consider sharing this with someone you trust or a professional.');
                if (writingTime[0]) recommendations.push(`You mostly write in the ${writingTime[0].name}. Keep that slot, it clearly works for you.`);
                if (totalWords / entries.length < 40) recommendations.push('Your entries are brief. Try letting one run a bit longer than feels comfortable.');
            }

            return {
                writingPatterns: {
                    entries: entries.length,
                    entriesPerWeek: Math.round((entries.length / (spanDays / 7)) * 10) / 10,
                    mostActiveDay
                },
                topicTrends: this.countBy(entries.flatMap((e) => e.tags || []), 8),
                emotionalPatterns: {
                    averageMoodScore: Math.round(averageScore * 10) / 10,
                    topEmotions: this.countBy(entries.flatMap((e) => e.emotions || []), 5)
                },
                wordCount: {
                    total: totalWords,
                    average: entries.length ? Math.round(totalWords / entries.length) : 0
                },
                writingTime,
                recommendations
            };
        } catch (error) {
            console.error('Error getting insights:', error.message);
            throw new Error('Failed to get journal insights');
        }
    }

    // ───────────────────────── Prompts ─────────────────────────

    static async getPersonalizedPrompts(supabaseClient, userId, count = 5) {
        const wanted = Math.max(1, Math.min(count, 10));
        const fallback = [
            'What is one thing from today you want to remember?',
            'What has been taking up the most space in your mind lately?',
            'Describe a moment this week when you felt like yourself.',
            'What do you need more of right now, and what do you need less of?',
            'Write a note to yourself a month from now.',
            'What are you avoiding, and what would be the first small step toward it?',
            'Who or what made you feel supported recently?'
        ];

        try {
            const { data } = await supabaseClient
                .from('journal_entries')
                .select('mood, tags')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(8);

            if (!data || data.length === 0) return fallback.slice(0, wanted);

            const themes = this.countBy(data.flatMap((e) => e.tags || []), 5).map((t) => t.name).join(', ') || 'none yet';
            const moods = data.map((e) => e.mood).filter(Boolean).join(', ') || 'unknown';

            const model = genAI.getGenerativeModel({ model: config.gemini.model });
            const result = await model.generateContent(
                `Write ${wanted} short, warm journaling prompts (one sentence each) for someone whose recent entries touched on: ${themes}. Recent moods: ${moods}. ` +
                `Do not quote or reveal specifics, keep them open-ended and gentle. Return one prompt per line, no numbering or bullets.`
            );
            const prompts = result.response.text().split('\n')
                .map((l) => l.replace(/^[\s\-*\d.)]+/, '').trim())
                .filter((l) => l.length > 10 && l.length < 300)
                .slice(0, wanted);

            return prompts.length ? prompts : fallback.slice(0, wanted);
        } catch (error) {
            console.error('Error generating personalized prompts:', error.message);
            return fallback.slice(0, wanted);
        }
    }

    // ───────────────────────── Export ─────────────────────────

    static async exportEntries(supabaseClient, userId, startDate, endDate, format = 'json') {
        try {
            const entries = await this.fetchEntriesBetween(supabaseClient, userId, startDate, endDate);
            const rows = entries.map((e) => ({
                date: this.entryDay(e),
                title: e.title,
                mood: e.mood,
                moodScore: e.mood_score,
                tags: e.tags || [],
                content: e.content,
                insight: e.ai_insight
            }));

            if (format === 'csv') {
                const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const header = ['date', 'title', 'mood', 'moodScore', 'tags', 'content', 'insight'];
                return [header.join(','), ...rows.map((r) => [r.date, r.title, r.mood, r.moodScore, r.tags.join('; '), r.content, r.insight].map(cell).join(','))].join('\n');
            }

            if (format === 'md' || format === 'txt') {
                return rows.map((r) =>
                    format === 'md'
                        ? `## ${r.title} (${r.date})\n\n*Mood: ${r.mood}${r.tags.length ? ` · Tags: ${r.tags.join(', ')}` : ''}*\n\n${r.content}\n`
                        : `${r.title} (${r.date})\nMood: ${r.mood}\n\n${r.content}\n`
                ).join('\n---\n\n');
            }

            return { exportedAt: new Date().toISOString(), entryCount: rows.length, entries: rows };
        } catch (error) {
            console.error('Error exporting entries:', error.message);
            throw new Error('Failed to export entries');
        }
    }

    // ───────────────────────── Reminders ─────────────────────────

    static defaultReminders() {
        return { enabled: false, time: '20:00', days: [0, 1, 2, 3, 4, 5, 6] };
    }

    static async getReminders(supabaseClient, userId) {
        const { data, error } = await supabaseClient
            .from('journal_reminders')
            .select('enabled, reminder_time, days')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw new Error('Failed to get reminders');
        if (!data) return this.defaultReminders();
        return { enabled: data.enabled, time: data.reminder_time, days: data.days };
    }

    static async setReminders(supabaseClient, userId, settings = {}) {
        const defaults = this.defaultReminders();
        const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.time) ? settings.time : defaults.time;
        const days = Array.isArray(settings.days)
            ? [...new Set(settings.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
            : defaults.days;

        const row = {
            user_id: userId,
            enabled: Boolean(settings.enabled),
            reminder_time: time,
            days,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient.from('journal_reminders').upsert(row, { onConflict: 'user_id' });
        if (error) throw new Error('Failed to save reminders');

        return { settings: { enabled: row.enabled, time, days } };
    }
}
