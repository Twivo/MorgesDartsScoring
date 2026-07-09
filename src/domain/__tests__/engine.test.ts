import { describe, it, expect } from 'vitest';
import { buildGameState } from '../engine';
import { makeVisit, makeBust, makeLegForfeit, makeGameForfeit } from '../events';
import type { GameConfig, GameEvent } from '../types';

function singleConfig(over: Partial<GameConfig> = {}): GameConfig {
  return {
    id: 'g1',
    createdAt: 0,
    variant: 501,
    outRule: 'DOUBLE',
    mode: 'SINGLE',
    legsToWin: 2,
    participants: [
      { id: 'A', label: 'Alice', playerIds: ['pa'] },
      { id: 'B', label: 'Bob', playerIds: ['pb'] },
    ],
    players: [
      { id: 'pa', name: 'Alice' },
      { id: 'pb', name: 'Bob' },
    ],
    startingPolicy: 'MANUAL',
    alternateStarter: false,
    firstStarterId: 'A',
    ...over,
  };
}

/** Build VISIT events; the engine re-derives ownership, so ids here are nominal. */
function visit(scored: number): GameEvent {
  return makeVisit({ participantId: 'A', playerId: 'pa', scored });
}

describe('buildGameState — basics', () => {
  it('starts both players at the variant score', () => {
    const config = singleConfig();
    const s = buildGameState(config, []);
    expect(s.remaining['A']).toBe(501);
    expect(s.remaining['B']).toBe(501);
    expect(s.activeParticipantId).toBe('A');
    expect(s.status).toBe('IN_PROGRESS');
  });

  it('subtracts a normal visit and passes the turn', () => {
    const config = singleConfig();
    const s = buildGameState(config, [visit(60)]);
    expect(s.remaining['A']).toBe(441);
    expect(s.remaining['B']).toBe(501);
    expect(s.activeParticipantId).toBe('B');
  });

  it('alternates turns by position regardless of recorded ids', () => {
    const config = singleConfig();
    const s = buildGameState(config, [visit(60), visit(100)]);
    expect(s.remaining['A']).toBe(441);
    expect(s.remaining['B']).toBe(401);
    expect(s.activeParticipantId).toBe('A');
  });
});

describe('bust rules (double-out)', () => {
  it('busts on overshoot, leaving score unchanged', () => {
    const config = singleConfig({ variant: 501 });
    // A: 501 -> needs to get low. Take A to 50, then score 60 -> bust.
    const events = [visit(451), visit(0), visit(60)]; // A=50 after first? no
    // Recompute: visit(451): A 501-451=50. visit(0): B 501. visit(60): A 50-60 bust.
    const s = buildGameState(config, events);
    expect(s.remaining['A']).toBe(50);
    const last = s.legs[0]!.visits[2]!;
    expect(last.isBust).toBe(true);
    expect(last.effectiveScore).toBe(0);
  });

  it('treats leaving exactly 1 as a bust', () => {
    const config = singleConfig();
    const events = [visit(451), visit(0), visit(49)]; // A 50 -> 1 => bust
    const s = buildGameState(config, events);
    expect(s.remaining['A']).toBe(50);
    expect(s.legs[0]!.visits[2]!.isBust).toBe(true);
  });

  it('allows a checkout that reaches exactly 0', () => {
    const config = singleConfig();
    const events = [visit(451), visit(0), visit(50)]; // A 50 -> 0 checkout
    const s = buildGameState(config, events);
    expect(s.legs[0]!.winnerId).toBe('A');
    expect(s.legs[0]!.endReason).toBe('CHECKOUT');
    expect(s.legsWon['A']).toBe(1);
  });
});

describe('explicit BUST event', () => {
  it('records a bust, keeps score, passes turn', () => {
    const config = singleConfig();
    const events: GameEvent[] = [
      visit(100),
      makeBust({ participantId: 'B', playerId: 'pb' }),
    ];
    const s = buildGameState(config, events);
    expect(s.remaining['A']).toBe(401);
    expect(s.remaining['B']).toBe(501);
    expect(s.activeParticipantId).toBe('A');
    expect(s.stats.byParticipant['B']!.busts).toBe(1);
  });
});

describe('legs, game over and starter alternation', () => {
  it('wins the game after reaching legsToWin', () => {
    const config = singleConfig({ legsToWin: 2 });
    const winLeg: GameEvent[] = [visit(451), visit(0), visit(50)];
    const s = buildGameState(config, [...winLeg, ...winLeg]);
    expect(s.legsWon['A']).toBe(2);
    expect(s.status).toBe('GAME_OVER');
    expect(s.winnerId).toBe('A');
  });

  it('alternates the starter when enabled', () => {
    const config = singleConfig({ alternateStarter: true, legsToWin: 3 });
    const winLeg: GameEvent[] = [visit(451), visit(0), visit(50)];
    const s = buildGameState(config, winLeg); // leg 1 done, leg 2 starts
    expect(s.legStarterId).toBe('B');
  });
});

describe('forfeits', () => {
  it('leg forfeit gives the leg to the opponent', () => {
    const config = singleConfig({ legsToWin: 2 });
    const s = buildGameState(config, [makeLegForfeit('A')]);
    expect(s.legs[0]!.winnerId).toBe('B');
    expect(s.legsWon['B']).toBe(1);
  });

  it('game forfeit ends the game immediately', () => {
    const config = singleConfig();
    const s = buildGameState(config, [makeGameForfeit('A')]);
    expect(s.status).toBe('GAME_OVER');
    expect(s.winnerId).toBe('B');
  });
});

describe('determinism under edits', () => {
  it('recomputes consistently when a middle visit is deleted', () => {
    const config = singleConfig();
    const events = [visit(60), visit(100), visit(40)];
    const full = buildGameState(config, events);
    expect(full.remaining['A']).toBe(401); // 501-60-40
    expect(full.remaining['B']).toBe(401); // 501-100

    const edited = events.filter((_, i) => i !== 1); // remove B's 100
    const s = buildGameState(config, edited);
    // Now both remaining events belong to A then B by position
    expect(s.remaining['A']).toBe(441); // 501-60
    expect(s.remaining['B']).toBe(461); // 501-40
  });
});
