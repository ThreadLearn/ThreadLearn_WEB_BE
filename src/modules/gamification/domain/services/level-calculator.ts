/**
 * Calculates user level based on XP.
 * Single source of truth formula: Level = Math.floor(XP / 1000) + 1
 */
export function calculateLevel(xp: number): number {
  return Math.floor((xp ?? 0) / 1000) + 1;
}
