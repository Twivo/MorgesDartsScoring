/**
 * The engine: the deterministic heart of the app.
 *
 *   GameState = buildGameState(config, events)
 *
 * Pure function, no side effects, no React, no storage. Every piece of
 * derived data (remaining score, leg winners, active thrower, stats) is
 * recomputed here from scratch on every call. Editing or deleting any event
 * and re-running this function yields a fully consistent state.
 *
 * IMPORTANT: turn ownership (which participant/player a VISIT/BUST belongs to)
 * is RE-DERIVED from turn order by position, NOT trusted from the event's
 * recorded participantId. This is what makes mid-history edits/deletes correct:
 * removing a visit shifts every following turn automatically.
 */
import { resolveVisit } from './rules/bust';
import {
  nextLegStarter,
  nextThrower,
  opponentOf,
} from './rules/turnOrder';
import { computeStats } from './stats';
import type {
  GameConfig,
  GameEvent,
  GameState,
  GameStatus,
  LegState,
  ResolvedVisit,
} from './types';

function startScoreOf(config: GameConfig): number {
  return config.variant;
}

function freshRemaining(config: GameConfig): Record<string, number> {
  const r: Record<string, number> = {};
  for (const p of config.participants) r[p.id] = startScoreOf(config);
  return r;
}

function newLeg(index: number, starterId: string, config: GameConfig): LegState {
  return {
    index,
    starterId,
    visits: [],
    remaining: freshRemaining(config),
  };
}

export function buildGameState(
  config: GameConfig,
  events: GameEvent[],
): GameState {
  const legsWon: Record<string, number> = {};
  for (const p of config.participants) legsWon[p.id] = 0;

  const legs: LegState[] = [];
  let starterId = config.firstStarterId;
  let leg = newLeg(0, starterId, config);

  let status: GameStatus = 'IN_PROGRESS';
  let winnerId: string | undefined;

  const closeAndAdvance = (
    closedLeg: LegState,
    legWinnerId: string,
  ): void => {
    legsWon[legWinnerId] = (legsWon[legWinnerId] ?? 0) + 1;
    legs.push(closedLeg);
    if ((legsWon[legWinnerId] ?? 0) >= config.legsToWin) {
      status = 'GAME_OVER';
      winnerId = legWinnerId;
    } else {
      starterId = nextLegStarter(config, closedLeg.starterId);
      leg = newLeg(legs.length, starterId, config);
    }
  };

  for (const event of events) {
    if (status === 'GAME_OVER') break;

    switch (event.type) {
      case 'VISIT':
      case 'BUST': {
        const thrower = nextThrower(config, leg);
        const remainingBefore = leg.remaining[thrower.participantId] ?? 0;

        let resolved: ResolvedVisit;
        if (event.type === 'BUST') {
          resolved = {
            event,
            participantId: thrower.participantId,
            playerId: thrower.playerId,
            effectiveScore: 0,
            remainingBefore,
            remainingAfter: remainingBefore,
            isBust: true,
            isCheckout: false,
          };
        } else {
          const outcome = resolveVisit(remainingBefore, event.scored);
          resolved = {
            event,
            participantId: thrower.participantId,
            playerId: thrower.playerId,
            effectiveScore: outcome.effectiveScore,
            remainingBefore,
            remainingAfter: outcome.remainingAfter,
            isBust: outcome.isBust,
            isCheckout: outcome.isCheckout,
          };
        }

        leg.visits.push(resolved);
        leg.remaining = {
          ...leg.remaining,
          [thrower.participantId]: resolved.remainingAfter,
        };

        if (resolved.isCheckout) {
          leg.winnerId = thrower.participantId;
          leg.endReason = 'CHECKOUT';
          closeAndAdvance(leg, thrower.participantId);
        }
        break;
      }

      case 'LEG_FORFEIT': {
        const winnerOfLeg = opponentOf(config, event.participantId);
        leg.winnerId = winnerOfLeg;
        leg.endReason = 'FORFEIT';
        closeAndAdvance(leg, winnerOfLeg);
        break;
      }

      case 'GAME_FORFEIT': {
        const gameWinner = opponentOf(config, event.participantId);
        leg.winnerId = gameWinner;
        leg.endReason = 'FORFEIT';
        legs.push(leg);
        status = 'GAME_OVER';
        winnerId = gameWinner;
        break;
      }
    }
  }

  // If the game is still going, the working leg is the open in-progress leg.
  if (status !== 'GAME_OVER') {
    legs.push(leg);
  }

  const currentLeg = legs[legs.length - 1]!;
  const currentLegIndex = currentLeg.index;

  let activeParticipantId: string;
  let activePlayerId: string;
  if (status === 'IN_PROGRESS') {
    const t = nextThrower(config, currentLeg);
    activeParticipantId = t.participantId;
    activePlayerId = t.playerId;
  } else {
    activeParticipantId = winnerId ?? config.firstStarterId;
    const part = config.participants.find((p) => p.id === activeParticipantId);
    activePlayerId = part?.playerIds[0] ?? '';
  }

  // status is LEG_OVER only transiently; with auto-advance we expose
  // IN_PROGRESS or GAME_OVER. Kept in the type for future manual confirmation.

  const remaining = currentLeg.remaining;

  const stats = computeStats(config, legs, legsWon);

  return {
    config,
    legs,
    currentLegIndex,
    legsWon,
    remaining,
    activeParticipantId,
    activePlayerId,
    legStarterId: currentLeg.starterId,
    status,
    winnerId,
    stats,
  };
}
