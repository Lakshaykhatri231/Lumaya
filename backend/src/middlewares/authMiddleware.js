import { supabase } from '../utils/supabase.js';

export const authenticate = async (req, res, next) => {
    //console.log('Auth headers:', req.headers);
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        const { data, error } = await supabase.auth.getUser(token);
        if (error) return res.status(401).json({ error: 'Invalid token' });
        
        console.log('Authenticated user:', data.user); // Log the user data
        req.user = data.user;
        next();
    } catch (err) {
        console.error('Authentication error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
};
