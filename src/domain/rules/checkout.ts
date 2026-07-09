/**
 * Minimum number of darts required to check out a given score (Double-Out).
 *
 * A finish always ends on a double. We compute, for a remaining score, the
 * smallest number of darts (1-3) with which it is *physically possible* to
 * finish. Used to disable impossible dart-count choices on the checkout modal.
 *
 * Examples:
 *   40  -> 1 (D20)
 *   101 -> 2 (T17 + Bull)
 *   102 -> 3 (impossible in 2 darts)
 *   104 -> 2 (T18 + D25)
 *   170 -> 3 (T20 T20 Bull, the highest possible finish)
 *   168 -> null (a "bogey" number, not finishable)
 */

/** All values a single dart can score (singles, trebles, 25, bull). */
const SINGLE_DART: ReadonlySet<number> = (() => {
  const s = new Set<number>();
  for (let i = 1; i <= 20; i++) {
    s.add(i); // single
    s.add(i * 2); // double
    s.add(i * 3); // treble
  }
  s.add(25); // outer bull
  s.add(50); // bull
  return s;
})();

/** Values that finish on a double (the last dart of any checkout). */
const DOUBLE_OUT: ReadonlySet<number> = (() => {
  const s = new Set<number>();
  for (let i = 1; i <= 20; i++) s.add(i * 2); // D1..D20
  s.add(50); // bull (D25)
  return s;
})();

const SINGLE_DART_LIST = [...SINGLE_DART];

function canFinishIn1(score: number): boolean {
  return DOUBLE_OUT.has(score);
}

function canFinishIn2(score: number): boolean {
  for (const a of SINGLE_DART_LIST) {
    if (DOUBLE_OUT.has(score - a)) return true;
  }
  return false;
}

function canFinishIn3(score: number): boolean {
  for (const a of SINGLE_DART_LIST) {
    const rest = score - a;
    if (rest < 2) continue;
    if (canFinishIn2(rest)) return true;
  }
  return false;
}

/**
 * Returns the minimum darts (1, 2 or 3) needed to finish `score`,
 * or null if it cannot be finished (score > 170 or a bogey number).
 */
export function minDartsToCheckout(score: number): 1 | 2 | 3 | null {
  if (score < 2 || score > 170) return null;
  if (canFinishIn1(score)) return 1;
  if (canFinishIn2(score)) return 2;
  if (canFinishIn3(score)) return 3;
  return null;
}
