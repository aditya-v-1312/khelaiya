import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Safely ignore connection strings (postgresql://...) and use anon/service API key
const supabaseKey = (rawServiceKey && !rawServiceKey.startsWith('postgres'))
  ? rawServiceKey
  : anonKey;

/**
 * Returns a server-side Supabase client for executing
 * transactional atomic operations and queries.
 */
export function getServiceSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
