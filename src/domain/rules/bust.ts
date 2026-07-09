/**
 * Bust & checkout rules for Double-Out games.
 *
 * Input is a TOTAL visit score (quick-entry style), not a dart breakdown.
 * Standard quick-entry semantics:
 *  - newRemaining < 0   -> bust (overshoot)
 *  - newRemaining === 1  -> bust (cannot finish from 1, a double is needed)
 *  - newRemaining === 0  -> valid checkout (assumed finished on a double)
 *  - otherwise           -> valid scoring visit
 *
 * A single visit can score at most 180 (three triple-20s).
 */
export const MAX_VISIT_SCORE = 180;

export interface VisitOutcome {
  isBust: boolean;
  isCheckout: boolean;
  /** Points actually subtracted (0 when busted). */
  effectiveScore: number;
  remainingAfter: number;
}

export function resolveVisit(
  remainingBefore: number,
  scored: number,
): VisitOutcome {
  const newRemaining = remainingBefore - scored;

  const isBust = newRemaining < 0 || newRemaining === 1;
  if (isBust) {
    return {
      isBust: true,
      isCheckout: false,
      effectiveScore: 0,
      remainingAfter: remainingBefore,
    };
  }

  return {
    isBust: false,
    isCheckout: newRemaining === 0,
    effectiveScore: scored,
    remainingAfter: newRemaining,
  };
}

/** Whether a raw entered score is structurally valid for a visit. */
export function isValidVisitScore(scored: number): boolean {
  return (
    Number.isInteger(scored) && scored >= 0 && scored <= MAX_VISIT_SCORE
  );
}
