/** Display helpers derived from a self-contained GameConfig. */
import type { GameConfig, Participant } from './types';

export function playerName(config: GameConfig, playerId: string): string {
  return config.players.find((p) => p.id === playerId)?.name ?? '???';
}

export function participantById(
  config: GameConfig,
  participantId: string,
): Participant | undefined {
  return config.participants.find((p) => p.id === participantId);
}

export function participantLabel(
  config: GameConfig,
  participantId: string,
): string {
  return participantById(config, participantId)?.label ?? '???';
}

/** Full player roster names for a participant (team members in DOUBLE). */
export function participantPlayers(
  config: GameConfig,
  participantId: string,
): string[] {
  const p = participantById(config, participantId);
  if (!p) return [];
  return p.playerIds.map((id) => playerName(config, id));
}

/**
 * Who this participant actually is: the player in SINGLE, both players joined
 * with "&" in DOUBLE. Prefer this over `participantLabel` (which is the team
 * name for doubles) wherever the actual competitors must be shown.
 */
export function participantDisplay(
  config: GameConfig,
  participantId: string,
): string {
  const names = participantPlayers(config, participantId);
  if (names.length === 0) return participantLabel(config, participantId);
  return names.join(' & ');
}
