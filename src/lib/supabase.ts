import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

/**
 * The Supabase client, or null when the project keys are missing.
 *
 * The anon key is meant to ship in the browser: what a signed-in user can read
 * or write is decided by the row-level security rules in supabase/schema.sql,
 * not by keeping this key secret.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
