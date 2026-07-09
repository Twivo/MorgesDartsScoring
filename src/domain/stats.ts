/** Statistics — fully derived from the resolved legs. */
import type {
  GameConfig,
  GameStats,
  LegState,
  ParticipantStats,
  ResolvedVisit,
  VisitEvent,
} from './types';

const CHECKOUTABLE_MAX = 170;

function emptyStats(participantId: string): ParticipantStats {
  return {
    participantId,
    legsWon: 0,
    totalScored: 0,
    totalDarts: 0,
    average3: 0,
    first9Average: 0,
    checkoutsHit: 0,
    checkoutAttempts: 0,
    checkoutPercent: 0,
    count180: 0,
    count140plus: 0,
    count100plus: 0,
    count60plus: 0,
    busts: 0,
    highestVisit: 0,
    averagePerLeg: [],
  };
}

function avg3(scored: number, darts: number): number {
  if (darts <= 0) return 0;
  return (scored / darts) * 3;
}

function tallyTon(s: ParticipantStats, scored: number): void {
  if (scored === 180) s.count180++;
  else if (scored >= 140) s.count140plus++;
  else if (scored >= 100) s.count100plus++;
  else if (scored >= 60) s.count60plus++;
}

export function computeStats(
  config: GameConfig,
  legs: LegState[],
  legsWon: Record<string, number>,
): GameStats {
  const byParticipant: Record<string, ParticipantStats> = {};
  for (const p of config.participants) {
    byParticipant[p.id] = emptyStats(p.id);
    byParticipant[p.id]!.legsWon = legsWon[p.id] ?? 0;
  }

  // first-9 accumulators (per participant, summed across legs)
  const first9Scored: Record<string, number> = {};
  const first9Darts: Record<string, number> = {};

  for (const leg of legs) {
    // per-participant per-leg accumulators
    const legScored: Record<string, number> = {};
    const legDarts: Record<string, number> = {};
    const visitsByParticipant: Record<string, ResolvedVisit[]> = {};
    const reachedCheckout: Record<string, boolean> = {};

    for (const p of config.participants) {
      legScored[p.id] = 0;
      legDarts[p.id] = 0;
      visitsByParticipant[p.id] = [];
      reachedCheckout[p.id] = false;
    }

    for (const v of leg.visits) {
      const s = byParticipant[v.participantId];
      if (!s) continue;

      s.totalScored += v.effectiveScore;
      s.totalDarts += v.event.darts;
      legScored[v.participantId] =
        (legScored[v.participantId] ?? 0) + v.effectiveScore;
      legDarts[v.participantId] =
        (legDarts[v.participantId] ?? 0) + v.event.darts;
      visitsByParticipant[v.participantId]!.push(v);

      if (v.isBust) s.busts++;
      if (v.effectiveScore > s.highestVisit) s.highestVisit = v.effectiveScore;

      if (v.event.type === 'VISIT') {
        const scored = (v.event as VisitEvent).scored;
        tallyTon(s, scored);
      }

      if (v.remainingBefore <= CHECKOUTABLE_MAX) {
        reachedCheckout[v.participantId] = true;
      }
      if (v.isCheckout) s.checkoutsHit++;
    }

    // first 9 darts (first up-to-3 visits) per participant this leg
    for (const p of config.participants) {
      const vs = visitsByParticipant[p.id] ?? [];
      let sc = 0;
      let dt = 0;
      for (const v of vs.slice(0, 3)) {
        sc += v.effectiveScore;
        dt += v.event.darts;
      }
      first9Scored[p.id] = (first9Scored[p.id] ?? 0) + sc;
      first9Darts[p.id] = (first9Darts[p.id] ?? 0) + dt;
    }

    // checkout attempts (one per leg in which they reached a finish)
    for (const p of config.participants) {
      const s = byParticipant[p.id]!;
      if (reachedCheckout[p.id]) s.checkoutAttempts++;

      const darts = legDarts[p.id] ?? 0;
      s.averagePerLeg.push(avg3(legScored[p.id] ?? 0, darts));

      // best/worst leg darts: only for legs this participant won by checkout
      if (leg.winnerId === p.id && leg.endReason === 'CHECKOUT') {
        s.bestLegDarts =
          s.bestLegDarts === undefined
            ? darts
            : Math.min(s.bestLegDarts, darts);
        s.worstLegDarts =
          s.worstLegDarts === undefined
            ? darts
            : Math.max(s.worstLegDarts, darts);
      }
    }
  }

  for (const p of config.participants) {
    const s = byParticipant[p.id]!;
    s.average3 = avg3(s.totalScored, s.totalDarts);
    s.first9Average = avg3(first9Scored[p.id] ?? 0, first9Darts[p.id] ?? 0);
    s.checkoutPercent =
      s.checkoutAttempts > 0
        ? (s.checkoutsHit / s.checkoutAttempts) * 100
        : 0;
  }

  return { byParticipant };
}
