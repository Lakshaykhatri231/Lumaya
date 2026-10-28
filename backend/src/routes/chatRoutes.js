import express from 'express';
import { ChatService } from '../services/chatService.js';
import { NudgeService } from '../services/NudgeService.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { MemoryService } from '../services/memoryService.js';
import { CacheService } from '../services/cacheService.js';

const router = express.Router();

router.post('/chat', authenticate, async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const userId = req.user.id;

    if (!sessionId || message === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const chatResponse = await ChatService.processMessage(userId, sessionId, message);
    res.status(200).json(chatResponse);
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Updated router endpoint
router.post('/refresh-session', authenticate, async (req, res) => {
  console.log('Refresh session endpoint hit');
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`🔄 Starting session refresh for user ${userId}, session ${sessionId}`);

    // Delete the existing session (now with summarization and long-term storage)
    // Pass userId to enable summarization and long-term storage
    const deletionResult = await MemoryService.deleteSessionMemory(sessionId, userId);
    
    if (!deletionResult.success) {
      console.log(`⚠️ Session ${sessionId} may not have existed or deletion failed`);
      // Continue anyway to create fresh session
    }

    // Invalidate any cached data for this session
    if (CacheService.invalidateSessionContext) {
      CacheService.invalidateSessionContext(userId);
      console.log(`🗑️ Cache invalidated for user ${userId}, session ${sessionId}`);
    }

    // Create a new session context - start with summary if available
    let initialContext = [];
    
    if (deletionResult.summary) {
      console.log(`📝 Starting new session with previous conversation summary`);
      initialContext = [{
        role: 'user',
        content: `Previous conversation summary.Remember that it was some other day session: ${deletionResult.summary}`,
        timestamp: new Date().toISOString(),
        type: 'session_summary'
      }];
    }

    // Create the new session with the summary context
    const newSessionCreated = await MemoryService.saveSessionMemory(sessionId, userId, initialContext);
    
    if (!newSessionCreated) {
      throw new Error('Failed to create new session');
    }

    console.log(`✅ Session ${sessionId} refreshed successfully for user ${userId}`);
    
    res.status(200).json({ 
      message: 'Session refreshed successfully',
      sessionId,
      summarizedAndSaved: deletionResult.success,
      hasPreviousSummary: !!deletionResult.summary,
      details: {
        previousSessionDeleted: deletionResult.success,
        newSessionCreated: newSessionCreated,
        dataPreservedInLongTerm: deletionResult.success,
        sessionStartsWithSummary: !!deletionResult.summary
      }
    });
  } catch (error) {
    console.error('❌ Session refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh session',
      details: error.message 
    });
  }
});
router.post('/nudge', authenticate, async (req, res) => {
  console.log('Nudge endpoint hit'); // Debug log
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required for nudge' });
    }

    // Call the nudge service instead of ChatService
    const nudgeResponse = await NudgeService.generateNudge(userId, sessionId);

    res.status(200).json(nudgeResponse); // Send back the generated nudge message

  } catch (error) {
    console.error('Nudge generation error:', error);
    res.status(500).json({ error: 'Failed to generate nudge message' });
  }
});

export default router;