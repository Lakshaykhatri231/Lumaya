import express from 'express';
import { authenticate, enforceNotBlocked } from '../middlewares/authMiddleware.js';
import { toolsLimiter } from '../middlewares/rateLimiters.js';
import { generateTherapyResponse } from '../services/geminiService.js';

const router = express.Router();

const TOOL_TYPES = ['dream', 'mental-health', 'life-prediction', 'relationship'];
const MAX_PROMPT_LENGTH = 6000;

/**
 * Guided tools (Dream Interpreter, Mental Health Plan, Life Prediction, Relationship Coaching).
 * The browser builds the tool-specific prompt; Gemini is only ever called from here.
 */
router.post('/generate', authenticate, toolsLimiter, enforceNotBlocked, async (req, res) => {
  const { prompt, type } = req.body;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `Prompt must be under ${MAX_PROMPT_LENGTH} characters` });
  }
  if (!TOOL_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Unknown tool type' });
  }

  try {
    const response = await generateTherapyResponse(prompt, type);
    res.status(200).json({ response });
  } catch (error) {
    console.error(`Tool generation error (${type}):`, error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export default router;
