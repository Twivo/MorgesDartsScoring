/**
 * Supabase client — created lazily and only when env vars are present.
 * When they're absent the app runs in local-only mode (no crash), so the
 * existing offline experience keeps working unchanged.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
    );
  }
  if (!cached) {
    cached = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cached;
}
