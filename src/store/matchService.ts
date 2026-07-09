/**
 * Match persistence — the database is the single source of truth.
 *
 * Nothing is written to LocalStorage. Every save sends the full event log, so
 * a caller that retries a failed write self-heals (a later success supersedes
 * any earlier failure). Callers that need offline resilience (the live game)
 * keep the events in memory and retry until the DB accepts them.
 */
import { getRepository } from '@/data';
import type { MatchRecord } from '@/data/types';

/** Save the match to the DB. Throws on failure so the caller can retry. */
export async function persistMatch(record: MatchRecord): Promise<void> {
  await getRepository().saveMatch(record);
}

/** Load a match by id from the DB (null if missing or unreachable). */
export async function loadMatch(id: string): Promise<MatchRecord | null> {
  try {
    return await getRepository().getMatch(id);
  } catch {
    return null;
  }
}

/** In-progress matches for the resume prompt (from the DB). */
export async function listResumable(): Promise<MatchRecord[]> {
  try {
    return await getRepository().listInProgress();
  } catch {
    return [];
  }
}
