import { randomnumber } from 'zss/mapping/number'

/** Peak onset jitter for live #play / #bgplay (±HUMANIZE_SEC). */
export const HUMANIZE_SEC = 0.004

/**
 * Nudge a scheduled AudioContext onset by a small random error.
 * Offline / record paths must not call this (keep grid-locked).
 */
export function humanizeonset(
  when: number,
  rng: () => number = randomnumber,
): number {
  return when + (rng() * 2 - 1) * HUMANIZE_SEC
}
