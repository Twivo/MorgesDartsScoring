/** Event constructors — the only place GameEvents are created. */
import { createId } from '@/lib/id';
import type {
  BustEvent,
  GameForfeitEvent,
  LegForfeitEvent,
  VisitEvent,
} from './types';

export function makeVisit(args: {
  participantId: string;
  playerId: string;
  scored: number;
  darts?: number;
}): VisitEvent {
  return {
    id: createId('ev'),
    ts: Date.now(),
    type: 'VISIT',
    participantId: args.participantId,
    playerId: args.playerId,
    scored: args.scored,
    darts: args.darts ?? 3,
  };
}

export function makeBust(args: {
  participantId: string;
  playerId: string;
  darts?: number;
}): BustEvent {
  return {
    id: createId('ev'),
    ts: Date.now(),
    type: 'BUST',
    participantId: args.participantId,
    playerId: args.playerId,
    darts: args.darts ?? 3,
  };
}

export function makeLegForfeit(participantId: string): LegForfeitEvent {
  return {
    id: createId('ev'),
    ts: Date.now(),
    type: 'LEG_FORFEIT',
    participantId,
  };
}

export function makeGameForfeit(participantId: string): GameForfeitEvent {
  return {
    id: createId('ev'),
    ts: Date.now(),
    type: 'GAME_FORFEIT',
    participantId,
  };
}
