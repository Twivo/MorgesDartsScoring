import { describe, it, expect } from 'vitest';
import { minDartsToCheckout } from '../rules/checkout';

describe('minDartsToCheckout', () => {
  it('1-dart finishes (doubles and bull)', () => {
    expect(minDartsToCheckout(40)).toBe(1); // D20
    expect(minDartsToCheckout(2)).toBe(1); // D1
    expect(minDartsToCheckout(50)).toBe(1); // Bull
  });

  it('odd / non-double small scores need 2 darts', () => {
    expect(minDartsToCheckout(3)).toBe(2); // S1 + D1
    expect(minDartsToCheckout(41)).toBe(2); // S1 + D20
    expect(minDartsToCheckout(101)).toBe(2); // T17 + Bull
  });

  it('102 needs 3 darts (the case in point)', () => {
    expect(minDartsToCheckout(102)).toBe(3);
  });

  it('but some scores above 102 are still 2-dart finishes', () => {
    expect(minDartsToCheckout(104)).toBe(2); // T18 + D25
    expect(minDartsToCheckout(107)).toBe(2); // T19 + D25
    expect(minDartsToCheckout(110)).toBe(2); // T20 + D25
  });

  it('high 3-dart finishes', () => {
    expect(minDartsToCheckout(170)).toBe(3); // T20 T20 Bull
    expect(minDartsToCheckout(120)).toBe(3);
  });

  it('returns null for impossible scores', () => {
    expect(minDartsToCheckout(169)).toBeNull(); // bogey
    expect(minDartsToCheckout(168)).toBeNull(); // bogey
    expect(minDartsToCheckout(171)).toBeNull(); // > 170
    expect(minDartsToCheckout(1)).toBeNull(); // can't end on 1
  });
});
