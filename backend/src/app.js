import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { config, initializeConfig } from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import sitemapRouter from './routes/sitemap.js';
import chatRoutes from './routes/chatRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import toolsRoutes from './routes/toolsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { CacheService } from './services/cacheService.js';
import { authLimiter, signupInitiateLimiter } from './middlewares/rateLimiters.js';

dotenv.config();
await initializeConfig();

const isProduction = config.nodeEnv === 'production';

// Create and connect a Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

await redisClient.connect();
console.log('Redis client connected');

const app = express();

// Behind Render's proxy: needed for secure cookies and the real client IP
app.set('trust proxy', 1);

// CORS: FRONTEND_URL is the source of truth; FRONTEND_ORIGINS adds extras (comma separated)
const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');
const allowedOrigins = new Set(
  [
    config.frontendUrl,
    ...(process.env.FRONTEND_ORIGINS || '').split(','),
    'https://thelumaya.com',
    'https://www.thelumaya.com',
    ...(isProduction ? [] : ['http://localhost:5173'])
  ]
    .filter(Boolean)
    .map(normalizeOrigin)
);

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header = same-origin or non-browser client (health checks, Paddle webhooks)
    if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Paddle signature verification needs the raw body, so webhooks go before the JSON parser
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '1mb' }));

// Sessions only carry the in-progress sign-up (pending email/password + OTP flow)
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'lumaya:session:',
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  }
}));

// Routes
app.use('/api/chatbot', chatRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth/signup/initiate', signupInitiateLimiter);
app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup/complete', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/', sitemapRouter);

// Health check routes
app.get('/', (req, res) => {
  res.status(200).send('Backend is running successfully!');
});
app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake!');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(err.message?.includes('CORS') ? 403 : 500).json({ error: 'Internal Server Error' });
});

const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    await redisClient.quit();
    const otpService = await import('./services/otpService.js');
    await otpService.closeConnection();

    console.log('All connections closed. Shutting down...');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

signals.forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// A single failed promise (e.g. one Gemini call) must not take the whole server down
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

setInterval(() => {
  const cleanedCount = CacheService.cleanupExpired();
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
  }
}, 60 * 60 * 1000); // 1 hour
