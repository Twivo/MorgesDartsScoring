import type { EncounterSettings, FixtureFormatSlot } from './types';

/**
 * The encounter format — 4 singles, 2 doubles, 4 singles (10 matches).
 * Easily configurable: change the counts here and everything adapts
 * (composition blocks, totals, scoring, screens).
 */
export const ENCOUNTER_FORMAT: FixtureFormatSlot[] = [
  { kind: 'SINGLE', count: 4 },
  { kind: 'DOUBLE', count: 2 },
  { kind: 'SINGLE', count: 4 },
];

export const DEFAULT_ENCOUNTER_SETTINGS: EncounterSettings = {
  legsToWin: 2, // first to 2
  startingPolicy: 'BULL', // bull for leg 1…
  alternateStarter: true, // …then alternate
  starterSide: 'A',
};
