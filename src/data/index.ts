/**
 * Backend factory. Picks the cloud backend (Supabase) when configured,
 * otherwise the local fallback. Feature code only ever imports these two
 * getters, never a concrete implementation.
 */
import { getSupabase, isSupabaseConfigured } from './supabase/client';
import { SupabaseRepository } from './supabase/SupabaseRepository';
import { SupabaseAuth } from './supabase/SupabaseAuth';
import { LocalRepository } from './local/LocalRepository';
import { LocalAuth } from './local/LocalAuth';
import type { AuthProvider, DartsRepository } from './repository';

let repo: DartsRepository | null = null;
let auth: AuthProvider | null = null;

export function getRepository(): DartsRepository {
  if (!repo) {
    repo = isSupabaseConfigured
      ? new SupabaseRepository(getSupabase())
      : new LocalRepository();
  }
  return repo;
}

export function getAuth(): AuthProvider {
  if (!auth) {
    auth = isSupabaseConfigured
      ? new SupabaseAuth(getSupabase())
      : new LocalAuth();
  }
  return auth;
}

export { isSupabaseConfigured };
export * from './types';
export * from './repository';
