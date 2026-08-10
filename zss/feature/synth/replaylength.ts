import type { SYNTH_NOTE_ENTRY } from 'zss/feature/synth/playnotation'
import { tonenotationseconds } from 'zss/feature/synth/playnotation'
import { isstring } from 'zss/mapping/types'

/** Seconds of padding after the last audible event for release / FX tails. */
export const REPLAY_TAIL_PAD_SEC = 0.15

/**
 * Offline render length covering every tick's note duration plus a short tail.
 * Prefer this over (maxtime - mintime + constant) which ignores last-note length.
 */
export function replaylengthsec(
  durationsec: number,
  ticks: SYNTH_NOTE_ENTRY[],
  replayoffsetsec = 0,
): number {
  let latest = durationsec
  for (let i = 0; i < ticks.length; i++) {
    const [time, value] = ticks[i]
    const [, notation] = value
    let eventend = time + replayoffsetsec
    if (isstring(notation)) {
      eventend += tonenotationseconds(notation)
    }
    if (eventend > latest) {
      latest = eventend
    }
  }
  return Math.max(latest + REPLAY_TAIL_PAD_SEC, durationsec + 1.0)
}
