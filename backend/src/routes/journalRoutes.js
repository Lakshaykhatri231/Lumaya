import express from 'express';
import { JournalService } from '../services/journalService.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { getSupabaseClient } from '../utils/supabase.js';
import { journalLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

router.use(authenticate, journalLimiter);

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Get initial journal prompt to start a journaling session
 */
router.get('/initial-prompt', async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);
    
    const prompt = await JournalService.getInitialPrompt(supabaseClient, userId);
    
    res.status(200).json({ 
      prompt
    });
  } catch (error) {
    console.error('Initial prompt error:', error);
    res.status(500).json({ error: 'Failed to get initial prompt' });
  }
});

/**
 * Process a journal entry and get AI response with next prompt
 * Now handles conversation context from frontend
 */
router.post('/entry', async (req, res) => {
  try {
    const { entry, conversationContext, sessionDate } = req.body;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (typeof entry !== 'string' || entry.trim() === '') {
      return res.status(400).json({ error: 'Journal entry content is required' });
    }
    if (entry.length > 10000) {
      return res.status(400).json({ error: 'Journal entry is too long (10,000 characters max)' });
    }

    // Validate conversation context format
    let validatedContext = [];
    if (conversationContext && Array.isArray(conversationContext)) {
      validatedContext = conversationContext.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content || '',
        timestamp: msg.timestamp || new Date()
      }));
    }

    const journalResponse = await JournalService.processEntry(
      supabaseClient,
      userId, 
      entry, 
      validatedContext,
      sessionDate
    );
    
    res.status(200).json({
      response: journalResponse.response,
      nextPrompt: journalResponse.nextPrompt,
      entryId: journalResponse.entryId,
      analysis: journalResponse.analysis // Include analysis for frontend use
    });
  } catch (error) {
    console.error('Journal entry processing error:', error);
    res.status(500).json({ error: 'Failed to process journal entry' });
  }
});

/**
 * Get journal summary for a date range
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const summary = await JournalService.getJournalSummary(supabaseClient, userId, start, end);
    
    res.status(200).json({
      summary: summary.summary,
      entryCount: summary.entryCount,
      dateRange: summary.dateRange,
      insights: summary.insights
    });
  } catch (error) {
    console.error('Journal summary error:', error);
    res.status(500).json({ error: 'Failed to get journal summary' });
  }
});

/**
 * Days with entries in a month (YYYY-MM), for the calendar view
 */
router.get('/calendar', async (req, res) => {
  try {
    const { month } = req.query;
    if (!MONTH_KEY_RE.test(month || '')) {
      return res.status(400).json({ error: 'Month must be formatted as YYYY-MM' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const days = await JournalService.getCalendar(getSupabaseClient(token), req.user.id, month);

    res.status(200).json({ days });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Failed to get calendar' });
  }
});

/**
 * Get journal entries by tag
 */
router.get('/entries/by-tag', async (req, res) => {
  try {
    const { tag, startDate, endDate } = req.query;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!tag || tag.trim() === '') {
      return res.status(400).json({ error: 'Tag is required' });
    }

    const result = await JournalService.getEntriesByTag(
      supabaseClient,
      userId, 
      tag, 
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.status(200).json({
      entries: result.entries,
      tag: result.tag,
      totalResults: result.totalResults
    });
  } catch (error) {
    console.error('Get entries by tag error:', error);
    res.status(500).json({ error: 'Failed to get entries by tag' });
  }
});

/**
 * Get all journal entries for a specific date
 */
router.get('/entries/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!DATE_KEY_RE.test(date)) {
      return res.status(400).json({ error: 'Date must be formatted as YYYY-MM-DD' });
    }

    const entries = await JournalService.getEntriesForDate(supabaseClient, userId, date);
    
    res.status(200).json({
      entries
    });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

/**
 * Delete a specific journal entry
 */
router.delete('/entry/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!entryId) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    const result = await JournalService.deleteEntry(supabaseClient, userId, entryId);
    
    if (!result.success) {
      return res.status(404).json({ error: 'Journal entry not found or access denied' });
    }

    res.status(200).json({ 
      success: true
    });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

/**
 * Get journal statistics for the user
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    const stats = await JournalService.getJournalStats(supabaseClient, userId);
    
    res.status(200).json({
      totalEntries: stats.totalEntries,
      streak: stats.streak,
      averageWordsPerEntry: stats.averageWordsPerEntry,
      mostActiveDay: stats.mostActiveDay,
      topEmotions: stats.topEmotions
    });
  } catch (error) {
    console.error('Journal stats error:', error);
    res.status(500).json({ error: 'Failed to get journal statistics' });
  }
});

/**
 * Search journal entries by keyword or phrase
 */
router.get('/search', async (req, res) => {
  try {
    const { query, startDate, endDate } = req.query;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchResults = await JournalService.searchEntries(
      supabaseClient,
      userId, 
      query, 
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.status(200).json({
      entries: searchResults.entries,
      totalResults: searchResults.totalResults,
      query: query
    });
  } catch (error) {
    console.error('Search entries error:', error);
    res.status(500).json({ error: 'Failed to search journal entries' });
  }
});

/**
 * Get mood analysis for a date range
 */
router.get('/mood-analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const moodAnalysis = await JournalService.getMoodAnalysis(supabaseClient, userId, start, end);
    
    res.status(200).json({
      overallMood: moodAnalysis.overallMood,
      moodTrend: moodAnalysis.moodTrend,
      dominantEmotions: moodAnalysis.dominantEmotions,
      moodScore: moodAnalysis.moodScore,
      insights: moodAnalysis.insights,
      series: moodAnalysis.series
    });
  } catch (error) {
    console.error('Mood analysis error:', error);
    res.status(500).json({ error: 'Failed to get mood analysis' });
  }
});

/**
 * Export journal entries for a date range
 */
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const exportData = await JournalService.exportEntries(supabaseClient, userId, start, end, format);
    
    if (format === 'json') {
      res.status(200).json(exportData);
    } else {
      const contentTypes = { csv: 'text/csv', md: 'text/markdown', txt: 'text/plain' };
      if (!contentTypes[format]) {
        return res.status(400).json({ error: 'Format must be json, csv, md or txt' });
      }
      res.setHeader('Content-Type', `${contentTypes[format]}; charset=utf-8`);
      res.setHeader('Content-Disposition', `attachment; filename="journal_export.${format}"`);
      res.send(exportData);
    }
  } catch (error) {
    console.error('Export entries error:', error);
    res.status(500).json({ error: 'Failed to export journal entries' });
  }
});

/**
 * Get personalized journal prompts based on user's history
 */
router.get('/personalized-prompts', async (req, res) => {
  try {
    const { count = 5 } = req.query;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    const prompts = await JournalService.getPersonalizedPrompts(supabaseClient, userId, parseInt(count));
    
    res.status(200).json({
      prompts
    });
  } catch (error) {
    console.error('Personalized prompts error:', error);
    res.status(500).json({ error: 'Failed to get personalized prompts' });
  }
});

/**
 * Get writing streak information
 */
router.get('/streak', async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    const streakInfo = await JournalService.getWritingStreak(supabaseClient, userId);
    
    res.status(200).json({
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      streakStartDate: streakInfo.streakStartDate,
      nextMilestone: streakInfo.nextMilestone,
      totalDaysWritten: streakInfo.totalDaysWritten
    });
  } catch (error) {
    console.error('Writing streak error:', error);
    res.status(500).json({ error: 'Failed to get writing streak information' });
  }
});

/**
 * Get journal insights and patterns
 */
router.get('/insights', async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    const insights = await JournalService.getJournalInsights(supabaseClient, userId, timeframe);
    
    res.status(200).json({
      writingPatterns: insights.writingPatterns,
      topicTrends: insights.topicTrends,
      emotionalPatterns: insights.emotionalPatterns,
      wordCount: insights.wordCount,
      writingTime: insights.writingTime,
      recommendations: insights.recommendations
    });
  } catch (error) {
    console.error('Journal insights error:', error);
    res.status(500).json({ error: 'Failed to get journal insights' });
  }
});

/**
 * Tag a journal entry
 */
router.post('/entry/:entryId/tags', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { tags } = req.body;
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const result = await JournalService.tagEntry(supabaseClient, userId, entryId, tags);
    
    res.status(200).json({
      success: true,
      tags: result.tags
    });
  } catch (error) {
    console.error('Tag entry error:', error);
    res.status(500).json({ error: 'Failed to tag journal entry' });
  }
});

/**
 * Get all available tags
 */
router.get('/tags', async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    const tags = await JournalService.getAllTags(supabaseClient, userId);
    
    res.status(200).json({
      tags
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

/**
 * Set journal reminder preferences
 */
router.post('/reminders', async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderSettings = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    const result = await JournalService.setReminders(supabaseClient, userId, reminderSettings);
    
    res.status(200).json({
      success: true,
      settings: result.settings
    });
  } catch (error) {
    console.error('Set reminders error:', error);
    res.status(500).json({ error: 'Failed to set journal reminders' });
  }
});

/**
 * Get journal reminder preferences
 */
router.get('/reminders', async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    const supabaseClient = getSupabaseClient(token);

    const settings = await JournalService.getReminders(supabaseClient, userId);
    
    res.status(200).json({
      settings
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Failed to get journal reminders' });
  }
});

export default router;