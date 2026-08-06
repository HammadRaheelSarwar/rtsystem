import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let clientInstance = null;

if (supabaseUrl && supabaseKey) {
  clientInstance = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export const supabase = clientInstance;

export async function connectDB() {
  if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('WARNING: SUPABASE_URL / SUPABASE_ANON_KEY missing in environment variables.');
    }
  }
  return supabase;
}
