/**
 * Domain types — the single source of truth.
 *
 * Two categories live here:
 *  1. PERSISTED data: Player roster, GameConfig and the GameEvent[] log.
 *     This is the ONLY thing written to storage.
 *  2. DERIVED data: GameState and everything inside it. NEVER persisted,
 *     always recomputed from (config, events) by the engine.
 */

// ---------------------------------------------------------------------------
// Roster (persisted, independent of any game)
// ---------------------------------------------------------------------------

export interface Player {
  id: string;
  name: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Game configuration (persisted, frozen when the game starts)
// ---------------------------------------------------------------------------

export type GameVariant = 501 | 601;
export type GameMode = 'SINGLE' | 'DOUBLE';
export type OutRule = 'DOUBLE';
export type StartingPolicy = 'BULL' | 'MANUAL' | 'ALTERNATE';

/**
 * A Participant is a side that owns a score.
 * - SINGLE: one player  -> playerIds = [p]
 * - DOUBLE: a team of 2  -> playerIds = [pA, pB]
 */
export interface Participant {
  id: string;
  label: string;
  playerIds: string[];
}

export interface GameConfig {
  id: string;
  createdAt: number;
  variant: GameVariant;
  outRule: OutRule;
  mode: GameMode;
  /** First side to win this many legs wins the game. */
  legsToWin: number;
  participants: Participant[];
  /** Snapshot of players involved, so the game is self-contained. */
  players: Player[];
  startingPolicy: StartingPolicy;
  /** When true, the leg starter rotates each leg. */
  alternateStarter: boolean;
  /** participantId that starts leg 1 (result of bull / manual choice). */
  firstStarterId: string;
}

// ---------------------------------------------------------------------------
// Event log (persisted) — append-oriented but fully editable.
// ---------------------------------------------------------------------------

export type GameEventType =
  | 'VISIT'
  | 'BUST'
  | 'LEG_FORFEIT'
  | 'GAME_FORFEIT';

interface BaseEvent {
  id: string;
  ts: number;
  type: GameEventType;
}

/** A normal scoring visit (a turn). `scored` is the total for the visit. */
export interface VisitEvent extends BaseEvent {
  type: 'VISIT';
  participantId: string;
  /** The exact player who threw (matters for per-player stats in DOUBLE). */
  playerId: string;
  scored: number;
  /** Darts thrown this visit (3 normally, 1-3 on a checkout). */
  darts: number;
}

/** A busted visit: score unchanged, counts as 0, turn passes. */
export interface BustEvent extends BaseEvent {
  type: 'BUST';
  participantId: string;
  playerId: string;
  darts: number;
}

/** A side gives up the current leg; the opponent wins it. */
export interface LegForfeitEvent extends BaseEvent {
  type: 'LEG_FORFEIT';
  /** The participant who forfeits. */
  participantId: string;
}

/** A side gives up the whole game; the opponent is declared winner. */
export interface GameForfeitEvent extends BaseEvent {
  type: 'GAME_FORFEIT';
  participantId: string;
}

export type GameEvent =
  | VisitEvent
  | BustEvent
  | LegForfeitEvent
  | GameForfeitEvent;

// ---------------------------------------------------------------------------
// Persisted envelopes (what actually goes to LocalStorage)
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1;

export interface PersistedGame {
  schemaVersion: number;
  config: GameConfig;
  events: GameEvent[];
}

export interface PersistedRoster {
  schemaVersion: number;
  players: Player[];
}

// ---------------------------------------------------------------------------
// Derived state (NEVER persisted) — produced by the engine
// ---------------------------------------------------------------------------

export type GameStatus = 'IN_PROGRESS' | 'LEG_OVER' | 'GAME_OVER';
export type LegEndReason = 'CHECKOUT' | 'FORFEIT';

/** A visit after the engine resolved its effect on the score. */
export interface ResolvedVisit {
  event: VisitEvent | BustEvent;
  participantId: string;
  playerId: string;
  /** Score this visit actually subtracted (0 for bust). */
  effectiveScore: number;
  /** Remaining score for the participant BEFORE this visit. */
  remainingBefore: number;
  /** Remaining score for the participant AFTER this visit. */
  remainingAfter: number;
  isBust: boolean;
  isCheckout: boolean;
}

export interface LegState {
  index: number;
  starterId: string;
  visits: ResolvedVisit[];
  /** Remaining score per participant at the end of the resolved visits. */
  remaining: Record<string, number>;
  winnerId?: string;
  endReason?: LegEndReason;
}

export interface GameState {
  config: GameConfig;
  legs: LegState[];
  currentLegIndex: number;
  legsWon: Record<string, number>;
  /** Remaining per participant in the CURRENT leg. */
  remaining: Record<string, number>;
  activeParticipantId: string;
  activePlayerId: string;
  /** participantId starting the current leg. */
  legStarterId: string;
  status: GameStatus;
  winnerId?: string;
  stats: GameStats;
}

// ---------------------------------------------------------------------------
// Statistics (derived)
// ---------------------------------------------------------------------------

export interface ParticipantStats {
  participantId: string;
  legsWon: number;
  totalScored: number;
  totalDarts: number;
  /** 3-dart average over the whole game. */
  average3: number;
  /** Average of the first 3 visits (first 9 darts). */
  first9Average: number;
  checkoutsHit: number;
  checkoutAttempts: number;
  checkoutPercent: number;
  count180: number;
  count140plus: number;
  count100plus: number;
  count60plus: number;
  busts: number;
  bestLegDarts?: number;
  worstLegDarts?: number;
  highestVisit: number;
  /** 3-dart average per leg, indexed by leg. */
  averagePerLeg: number[];
}

export interface GameStats {
  byParticipant: Record<string, ParticipantStats>;
}
