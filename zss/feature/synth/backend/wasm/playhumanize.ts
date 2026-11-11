import { randomnumber } from 'zss/mapping/number'

/** Peak onset jitter for live #play (±HUMANIZE_SEC). */
export const HUMANIZE_SEC = 0.004

/** Peak onset jitter for live #bgplay SFX channels. */
export const HUMANIZE_BGPLAY_SEC = 0.002

/**
 * Whether live onset jitter should run for a pitched note.
 * Skip when offline/record (`livehumanize` false) or when portamento is on
 * so abutting notes stay grid-locked for clean glides.
 */
export function shouldhumanizeonset(
  livehumanize: boolean,
  portamento: number,
): boolean {
  return livehumanize && !(portamento > 0)
}

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
