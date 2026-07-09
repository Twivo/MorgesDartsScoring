import { describe, it, expect } from 'vitest';
import { aggregatePlayerStats, type MatchInput } from '../playerStats';
import { makeVisit } from '../events';
import type { GameConfig } from '../types';

function singleMatch(): MatchInput {
  const config: GameConfig = {
    id: 'm1',
    createdAt: 0,
    variant: 501,
    outRule: 'DOUBLE',
    mode: 'SINGLE',
    legsToWin: 1,
    participants: [
      { id: 'A', label: 'Alice', playerIds: ['pa'] },
      { id: 'B', label: 'Bob', playerIds: ['pb'] },
    ],
    players: [
      { id: 'pa', name: 'Alice' },
      { id: 'pb', name: 'Bob' },
    ],
    startingPolicy: 'MANUAL',
    alternateStarter: true,
    firstStarterId: 'A',
  };
  const v = (scored: number) => makeVisit({ participantId: 'A', playerId: 'x', scored });
  // Alice starts: 180,180,141(checkout). Bob: 100,100.
  const events = [v(180), v(100), v(180), v(100), v(141)];
  return { config, events };
}

describe('aggregatePlayerStats', () => {
  it('attributes per-player stats and match win to the checkout side', () => {
    const stats = aggregatePlayerStats([singleMatch()]);
    const alice = stats.find((s) => s.name === 'Alice')!;
    const bob = stats.find((s) => s.name === 'Bob')!;

    expect(alice.totalScored).toBe(501);
    expect(alice.totalDarts).toBe(9);
    expect(alice.average3).toBeCloseTo(167, 5);
    expect(alice.count180).toBe(2);
    expect(alice.checkoutHits).toBe(1);
    expect(alice.bestCheckout).toBe(141);
    expect(alice.legsWon).toBe(1);
    expect(alice.matchesWon).toBe(1);
    expect(alice.bestLegDarts).toBe(9);

    expect(bob.totalScored).toBe(200);
    expect(bob.count100plus).toBe(2);
    expect(bob.matchesWon).toBe(0);
    expect(bob.winRatio).toBe(0);
  });

  it('sums across multiple matches', () => {
    const stats = aggregatePlayerStats([singleMatch(), singleMatch()]);
    const alice = stats.find((s) => s.name === 'Alice')!;
    expect(alice.matchesPlayed).toBe(2);
    expect(alice.matchesWon).toBe(2);
    expect(alice.count180).toBe(4);
  });
});
