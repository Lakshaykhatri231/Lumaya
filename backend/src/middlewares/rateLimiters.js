import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down and try again shortly.' }
};

// Keyed by the authenticated user, so these must run after `authenticate`
const perUser = (req) => req.user?.id || 'anonymous';

/** Sign in / sign up completion: keyed by IP */
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 20 });

/** Sending verification emails costs money and can be abused to spam addresses */
export const signupInitiateLimiter = rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 8 });

/** Each chat message triggers several Gemini calls */
export const chatLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: 20, keyGenerator: perUser });

export const nudgeLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: 6, keyGenerator: perUser });

export const toolsLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: 8, keyGenerator: perUser });

export const journalLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: 60, keyGenerator: perUser });
