import express from 'express';
import session from 'express-session';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config, initializeConfig } from './config/index.js';
import emailRoutes from './routes/emailRoutes.js';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import dotenv from 'dotenv';
import sitemapRouter from './routes/sitemap.js';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import chatRoutes from './routes/chatRoutes.js';
import { CacheService } from './services/cacheService.js';
import journalRoutes from './routes/journalRoutes.js'

dotenv.config();
await initializeConfig();

// Create and connect a Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

await redisClient.connect();
console.log('Redis client connected');

// Initialize Express app
const app = express();

// Configure session middleware with Redis store
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://www.xryptt.com', 'https://xryptt.com', 'https://xrypttsaas-1.onrender.com', 'https://xrypttsaas.onrender.com','https://frontend-ai1.onrender.com','https://thelumaya.com/','https://www.thelumaya.com/','https://thelumaya.com',
        'https://www.thelumaya.com','http://localhost:5173','https://lumaya-frontend-qc0u.onrender.com']
    : ['http://localhost:5173','https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--33edf5bb.local-credentialless.webcontainer-api.io','https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3-ujzq9jau--5173--33edf5bb.local-credentialless.webcontainer-api.io','https://frontend-ai1.onrender.com','https://thelumaya.com/','https://www.thelumaya.com/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'lumaya:session:',
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,
    httpOnly: true,
    //sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
   sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000,
  }
}));

// Parse JSON requests
app.use(bodyParser.json());

// Routes
app.use('/api/chatbot', chatRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/', sitemapRouter);

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('Backend is running successfully!');
  console.log('backend');
});
app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake!');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});



// Start the server
const PORT = config.port || 3000;
console.log(PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    console.log('Closing main Redis client...');
    await redisClient.quit();
    console.log('Main Redis client closed successfully');
    
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});
setInterval(() => {
  const cleanedCount = CacheService.cleanupExpired();
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
  }
}, 60 * 60 * 1000); // 1 hour