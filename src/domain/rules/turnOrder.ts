/** Turn order: who throws next, and which leg starter comes next. */
import type { GameConfig, LegState, Participant } from '../types';

/** The two (or more) participants ordered so the starter is first. */
export function participantOrder(
  config: GameConfig,
  starterId: string,
): Participant[] {
  const all = config.participants;
  const startIdx = all.findIndex((p) => p.id === starterId);
  if (startIdx <= 0) return [...all];
  return [...all.slice(startIdx), ...all.slice(0, startIdx)];
}

/** Count the visits a given participant has already taken in a leg. */
function participantVisitCount(leg: LegState, participantId: string): number {
  let n = 0;
  for (const v of leg.visits) if (v.participantId === participantId) n++;
  return n;
}

export interface NextThrower {
  participantId: string;
  playerId: string;
}

/**
 * Given the resolved visits already in the current leg, determine who throws
 * next. Participants alternate; within a DOUBLE participant the two players
 * alternate stably across that participant's visits.
 */
export function nextThrower(
  config: GameConfig,
  leg: LegState,
): NextThrower {
  const order = participantOrder(config, leg.starterId);
  const nextParticipant = order[leg.visits.length % order.length]!;
  const taken = participantVisitCount(leg, nextParticipant.id);
  const playerId =
    nextParticipant.playerIds[taken % nextParticipant.playerIds.length]!;
  return { participantId: nextParticipant.id, playerId };
}

/**
 * The participant that should start the NEXT leg.
 * When alternateStarter is on, the starter rotates through the participant
 * order; otherwise the same participant always starts.
 */
export function nextLegStarter(
  config: GameConfig,
  currentStarterId: string,
): string {
  if (!config.alternateStarter) return config.firstStarterId;
  const all = config.participants;
  const idx = all.findIndex((p) => p.id === currentStarterId);
  const next = all[(idx + 1) % all.length]!;
  return next.id;
}

/** The opponent (used for forfeits in a 2-side game). */
export function opponentOf(
  config: GameConfig,
  participantId: string,
): string {
  const other = config.participants.find((p) => p.id !== participantId);
  return other ? other.id : participantId;
}
