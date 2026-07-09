/**
 * Single-scorer lock. The device actively scoring a match holds a heartbeat
 * lock on its row; another device may only take control once that lock is
 * absent or stale (scorer closed / lost connection).
 *
 * The acquire is an atomic conditional UPDATE — it only succeeds when the row
 * is free, already ours, or stale — so two devices can't both grab control.
 *
 * Fail-open: with no cloud backend, or before the lock columns exist (migration
 * 0004 not yet run), or on any error, we allow scoring. Locking simply becomes
 * active once the backend supports it — the app never breaks waiting for it.
 */
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client';
import { getDeviceId } from '@/lib/device';

/** A lock is considered active while its heartbeat is younger than this. */
export const LOCK_STALE_MS = 20_000;
/** How often the scoring device should refresh its lock. */
export const LOCK_HEARTBEAT_MS = 8_000;

export interface LockOutcome {
  /** We hold control and may score. */
  held: boolean;
  /** Another device holds an active lock (we can only spectate). */
  byOther: boolean;
}

const FAIL_OPEN: LockOutcome = { held: true, byOther: false };

/** Acquire or refresh control of a match. Also used as the heartbeat. */
export async function acquireLock(matchId: string): Promise<LockOutcome> {
  if (!isSupabaseConfigured) return FAIL_OPEN;
  const me = getDeviceId();
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  try {
    const { data, error } = await getSupabase()
      .from('matches')
      .update({ locked_by: me, locked_at: new Date().toISOString() })
      .eq('id', matchId)
      .or(`locked_by.is.null,locked_by.eq.${me},locked_at.lt.${staleBefore}`)
      .select('id')
      .maybeSingle();
    if (error) return FAIL_OPEN; // columns missing / RLS — don't block scoring
    return data
      ? { held: true, byOther: false }
      : { held: false, byOther: true };
  } catch {
    return FAIL_OPEN;
  }
}

/** Release our lock so another device can take control immediately. */
export async function releaseLock(matchId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const me = getDeviceId();
  try {
    await getSupabase()
      .from('matches')
      .update({ locked_by: null, locked_at: null })
      .eq('id', matchId)
      .eq('locked_by', me);
  } catch {
    /* best-effort — a missed release just goes stale on its own */
  }
}
