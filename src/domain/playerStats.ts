/**
 * Per-player season statistics — aggregated across many matches by REUSING the
 * pure engine (buildGameState). No stat logic is duplicated: the engine
 * resolves busts/legs/winners, we attribute visit-level numbers to the actual
 * thrower (event.playerId) and leg/match outcomes to the winning side.
 *
 * Note: entries store a visit TOTAL (3 darts), not dart-by-dart, so single-dart
 * metrics aren't derivable. Everything below is computable from visit totals.
 */
import { buildGameState } from './engine';
import type { GameConfig, GameEvent, VisitEvent } from './types';

export interface PlayerSeasonStats {
  playerId: string;
  name: string;
  matchesPlayed: number;
  matchesWon: number;
  winRatio: number; // 0..1
  legsWon: number;
  totalScored: number;
  totalDarts: number;
  average3: number;
  first3Average: number; // first visit of each leg (first 3 darts)
  first9Average: number; // first 3 visits of each leg (first 9 darts)
  checkoutHits: number;
  checkoutAttempts: number;
  checkoutPercent: number;
  averageCheckout: number;
  bestCheckout: number;
  count180: number;
  count140plus: number;
  count100plus: number;
  count60plus: number;
  busts: number;
  highestVisit: number;
  bestLegDarts: number | null; // fewest darts to win a leg
}

export interface MatchInput {
  config: GameConfig;
  events: GameEvent[];
}

interface Acc extends PlayerSeasonStats {
  _first3Scored: number;
  _first3Darts: number;
  _first9Scored: number;
  _first9Darts: number;
  _checkoutSum: number;
}

function emptyAcc(playerId: string, name: string): Acc {
  return {
    playerId,
    name,
    matchesPlayed: 0,
    matchesWon: 0,
    winRatio: 0,
    legsWon: 0,
    totalScored: 0,
    totalDarts: 0,
    average3: 0,
    first3Average: 0,
    first9Average: 0,
    checkoutHits: 0,
    checkoutAttempts: 0,
    checkoutPercent: 0,
    averageCheckout: 0,
    bestCheckout: 0,
    count180: 0,
    count140plus: 0,
    count100plus: 0,
    count60plus: 0,
    busts: 0,
    highestVisit: 0,
    bestLegDarts: null,
    _first3Scored: 0,
    _first3Darts: 0,
    _first9Scored: 0,
    _first9Darts: 0,
    _checkoutSum: 0,
  };
}

const CHECKOUTABLE_MAX = 170;

export function aggregatePlayerStats(
  matches: MatchInput[],
): PlayerSeasonStats[] {
  const acc = new Map<string, Acc>();

  const ensure = (id: string, name: string): Acc => {
    let a = acc.get(id);
    if (!a) {
      a = emptyAcc(id, name);
      acc.set(id, a);
    }
    return a;
  };

  for (const { config, events } of matches) {
    const state = buildGameState(config, events);
    const nameOf = (pid: string) =>
      config.players.find((p) => p.id === pid)?.name ?? '???';
    const participantOfPlayer = (pid: string) =>
      config.participants.find((p) => p.playerIds.includes(pid))?.id;

    // match participation + wins
    for (const p of config.players) {
      const a = ensure(p.id, nameOf(p.id));
      a.matchesPlayed += 1;
      if (
        state.status === 'GAME_OVER' &&
        state.winnerId &&
        participantOfPlayer(p.id) === state.winnerId
      ) {
        a.matchesWon += 1;
      }
    }

    for (const leg of state.legs) {
      // group this leg's visits per player
      const byPlayer = new Map<string, typeof leg.visits>();
      for (const v of leg.visits) {
        const list = byPlayer.get(v.playerId) ?? [];
        list.push(v);
        byPlayer.set(v.playerId, list);
      }

      for (const [pid, visits] of byPlayer) {
        const a = ensure(pid, nameOf(pid));
        let reachedFinish = false;

        visits.forEach((v) => {
          a.totalScored += v.effectiveScore;
          a.totalDarts += v.event.darts;
          if (v.isBust) a.busts += 1;
          if (v.effectiveScore > a.highestVisit) a.highestVisit = v.effectiveScore;
          if (v.event.type === 'VISIT') {
            const s = (v.event as VisitEvent).scored;
            if (s === 180) a.count180 += 1;
            else if (s >= 140) a.count140plus += 1;
            else if (s >= 100) a.count100plus += 1;
            else if (s >= 60) a.count60plus += 1;
          }
          if (v.remainingBefore <= CHECKOUTABLE_MAX) reachedFinish = true;
          if (v.isCheckout) {
            a.checkoutHits += 1;
            a._checkoutSum += v.remainingBefore;
            if (v.remainingBefore > a.bestCheckout)
              a.bestCheckout = v.remainingBefore;
          }
        });

        // first 3 / first 9 darts of the leg for this player
        const first1 = visits.slice(0, 1);
        const first3 = visits.slice(0, 3);
        a._first3Scored += first1.reduce((s, v) => s + v.effectiveScore, 0);
        a._first3Darts += first1.reduce((s, v) => s + v.event.darts, 0);
        a._first9Scored += first3.reduce((s, v) => s + v.effectiveScore, 0);
        a._first9Darts += first3.reduce((s, v) => s + v.event.darts, 0);

        if (reachedFinish) a.checkoutAttempts += 1;

        // won leg by checkout -> best (fewest) leg darts. Count the winning
        // SIDE's darts (both partners in doubles), not just this player's —
        // otherwise a doubles leg looks like < 9 darts and gets hidden.
        if (leg.winnerId === participantOfPlayer(pid) && leg.endReason === 'CHECKOUT') {
          const legDarts = leg.visits
            .filter((v) => v.participantId === leg.winnerId)
            .reduce((s, v) => s + v.event.darts, 0);
          a.bestLegDarts =
            a.bestLegDarts === null ? legDarts : Math.min(a.bestLegDarts, legDarts);
        }
        if (leg.winnerId === participantOfPlayer(pid)) a.legsWon += 1;
      }
    }
  }

  const avg3 = (s: number, d: number) => (d > 0 ? (s / d) * 3 : 0);

  return [...acc.values()]
    .map((a) => {
      const stats: PlayerSeasonStats = {
        ...a,
        average3: avg3(a.totalScored, a.totalDarts),
        first3Average: avg3(a._first3Scored, a._first3Darts),
        first9Average: avg3(a._first9Scored, a._first9Darts),
        winRatio: a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0,
        checkoutPercent:
          a.checkoutAttempts > 0 ? (a.checkoutHits / a.checkoutAttempts) * 100 : 0,
        averageCheckout:
          a.checkoutHits > 0 ? a._checkoutSum / a.checkoutHits : 0,
      };
      return stats;
    })
    .sort((x, y) => y.average3 - x.average3);
}
