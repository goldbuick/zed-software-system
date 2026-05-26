import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'

/** When the pacer is stale, start the next #play at now instead of in the past. */
export function resolveplaystarttime(pacertime: number, now: number): number {
  if (pacertime === -1 || pacertime < now) {
    return now
  }
  return pacertime
}

/** Pattern end time for pacer advance — matches Tone `synthplaystart` (`last[0]`). */
export function playpatternendtime(
  pattern: SYNTH_NOTE_ENTRY[],
  starttime: number,
): number {
  let endtime = starttime
  const last = pattern[pattern.length - 1]
  if (last) {
    endtime = Math.max(endtime, last[0])
  }
  return endtime
}
