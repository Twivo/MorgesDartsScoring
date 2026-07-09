import { describe, it, expect } from 'vitest';
import {
  isOnFinish,
  validateVisitInput,
} from '../rules/validation';

describe('validateVisitInput', () => {
  it('accepts a normal score', () => {
    expect(validateVisitInput(501, 60)).toEqual({ ok: true, isCheckout: false });
  });

  it('rejects scores outside 0..180', () => {
    expect(validateVisitInput(501, 181).code).toBe('SCORE_RANGE');
    expect(validateVisitInput(501, -1).code).toBe('SCORE_RANGE');
  });

  it('rejects a score higher than what is left', () => {
    expect(validateVisitInput(40, 60).code).toBe('OVER_REMAINING');
  });

  it('rejects leaving exactly 1', () => {
    expect(validateVisitInput(40, 39).code).toBe('LEAVES_ONE');
  });

  it('accepts a valid checkout', () => {
    expect(validateVisitInput(40, 40)).toEqual({ ok: true, isCheckout: true });
  });

  it('rejects an impossible checkout (bogey number)', () => {
    // 169 cannot be checked out
    expect(validateVisitInput(169, 169).code).toBe('INVALID_CHECKOUT');
  });

  it('rejects scores impossible with three darts', () => {
    for (const s of [172, 173, 175, 176, 178, 179]) {
      expect(validateVisitInput(400, s).code).toBe('IMPOSSIBLE_SCORE');
    }
    // neighbours that ARE possible stay valid
    expect(validateVisitInput(400, 174).ok).toBe(true);
    expect(validateVisitInput(400, 177).ok).toBe(true);
    expect(validateVisitInput(400, 180).ok).toBe(true);
  });
});

describe('isOnFinish', () => {
  it('true for checkoutable remaining', () => {
    expect(isOnFinish(40)).toBe(true);
    expect(isOnFinish(170)).toBe(true);
  });
  it('false above 170 or for bogey numbers', () => {
    expect(isOnFinish(171)).toBe(false);
    expect(isOnFinish(169)).toBe(false);
  });
});
