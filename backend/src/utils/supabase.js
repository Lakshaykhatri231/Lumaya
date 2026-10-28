import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file (one directory up from the src folder)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log("DEBUG: SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("DEBUG: SUPABASE_ANON_KEY =", process.env.SUPABASE_ANON_KEY ? "Present" : "Missing");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseClient = (authToken) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
          headers: {
              Authorization: `Bearer ${authToken}`
          }
      }
  });
};

export const verifySupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('pg_stat_activity')
      .select('*')
      .limit(1);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};