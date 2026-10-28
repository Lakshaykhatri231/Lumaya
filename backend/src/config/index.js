import dotenv from 'dotenv';
import path from 'path';

// Declare config at the top level
export let config = {};

// Flag to track if config has already been initialized
let isConfigInitialized = false;

/**
 * Loads environment variables from .env file and sets the configuration object.
 * This function is designed to run only once.
 *
 * @returns {Promise<void>}
 */
export function initializeConfig() {
  return new Promise((resolve) => {
    // If already initialized, resolve immediately.
    if (isConfigInitialized) {
      return resolve();
    }

    // Load environment variables from .env file
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });

    // Set the configuration object
    config = {
      port: process.env.PORT || 3000, // Fallback to 3000 if PORT is not set
      supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      redis: {
        url: process.env.REDIS_URL
      },
      pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
        index: process.env.PINECONE_INDEX2,

      },
      huggingface: {
        apiKey1: process.env.HUGGINGFACE_API_KEY,
        apiKey2: process.env.HUGGINGFACE_API_KEY1
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY
      },
      resend: {
        apiKey: process.env.RESEND_API_KEY,
      },
      session: {

        secret: process.env.SESSION_SECRET
      },
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    // Mark as initialized so future calls won't reinitialize
    isConfigInitialized = true;
    resolve();
  });
}
