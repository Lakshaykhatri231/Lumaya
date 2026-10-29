import { supabase } from '../utils/supabase.js';
import { config } from '../config/index.js';
import { MemoryService } from '../services/memoryService.js';

export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

        req.user = data.user;
        next();
    } catch (err) {
        console.error('Authentication error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Admin-only routes. Admins are listed by Supabase user id in ADMIN_USER_IDS.
 * Must run after `authenticate`.
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user || !config.adminUserIds.includes(req.user.id)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

/**
 * Applies the SOS 24h lockout to endpoints other than /chat (nudge, tools).
 * Must run after `authenticate`.
 */
export const enforceNotBlocked = async (req, res, next) => {
    try {
        const blocked = await MemoryService.isUserBlocked(req.user.id);
        if (blocked) {
            return res.status(423).json({
                error: 'Access is temporarily restricted for your safety.',
                userBlocked: true,
                timeRemaining: blocked.timeRemaining,
                blockExpiresAt: blocked.expiresAt
            });
        }
        next();
    } catch (err) {
        // Redis hiccup: don't take the feature down, the chat route enforces the block itself.
        console.error('Block check failed:', err);
        next();
    }
};
