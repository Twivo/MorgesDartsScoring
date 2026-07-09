/**
 * Live spectating helpers. The database is the single source of truth: a
 * spectator reads a match and re-renders it, updated in real time via Supabase
 * Realtime (a push whenever the row changes), with a polling fallback so the
 * live view still works even if realtime is unavailable.
 */
import { getRepository } from '@/data';
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client';
import type { MatchRecord } from '@/data/types';

/** All in-progress matches (regular and championship) for the live list. */
export async function listLiveMatches(): Promise<MatchRecord[]> {
  try {
    return await getRepository().listLiveMatches();
  } catch {
    return [];
  }
}

/**
 * Subscribe to a match's changes. Calls `onChange` on every update; returns an
 * unsubscribe function. No-op (returns a noop) when realtime isn't available —
 * callers pair this with polling.
 */
export function subscribeMatch(matchId: string, onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => {};
  try {
    const sb = getSupabase();
    const channel = sb
      .channel(`live:${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        () => onChange(),
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
