import { randomnumber } from 'zss/mapping/number'

/** Peak onset jitter for live #play (±HUMANIZE_SEC). */
export const HUMANIZE_SEC = 0.008

/** Peak onset jitter for live #bgplay SFX channels. */
export const HUMANIZE_BGPLAY_SEC = 0.004

/**
 * Nudge a scheduled AudioContext onset by a small random error.
 * Offline / record paths must not call this (keep grid-locked).
 */
export function humanizeonset(
  when: number,
  rng?: () => number,
  peaksec: number = HUMANIZE_SEC,
): number {
  const roll = rng ?? randomnumber
  return when + (roll() * 2 - 1) * peaksec
}
