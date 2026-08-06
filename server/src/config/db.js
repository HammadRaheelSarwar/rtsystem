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
const recordsTable = process.env.SUPABASE_RECORDS_TABLE || 'app_records';

export async function connectDB() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing. Production persistence is unavailable.');
    }
  }
  return supabase;
}

export async function persistenceStatus() {
  if (!supabase || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ready: false, code: 'SUPABASE_NOT_CONFIGURED' };
  }
  const { error } = await supabase.from(recordsTable).select('id').limit(1);
  return error ? { ready: false, code: error.code, message: error.message } : { ready: true, table: recordsTable };
}
