/**
 * Top-level main-book `flags` row ids for gadget, synth, chips, and board tracking.
 * Chip suffix matches `createchipid` (`*_chip`).
 */

export const GADGET_FLAGS_SUFFIX = '_gadget'
export const SYNTH_FLAGS_SUFFIX = '_synth'
export const CHIP_FLAGS_SUFFIX = '_chip'
export const TRACKING_FLAGS_SUFFIX = '_tracking'

/** `mainbook.flags[${playerId}_gadget]` — full `GADGET_STATE` document. */
export function creategadgetmemid(player: string): string {
  return `${player}${GADGET_FLAGS_SUFFIX}`
}

/** `mainbook.flags[${boardId}_synth]` — combined synth cache + play queue. */
export function createsynthmemid(board: string): string {
  return `${board}${SYNTH_FLAGS_SUFFIX}`
}

export function gadgetmemidstem(memid: string): string {
  if (!memid.endsWith(GADGET_FLAGS_SUFFIX)) {
    return ''
  }
  return memid.slice(0, -GADGET_FLAGS_SUFFIX.length)
}

export function synthmemidstem(memid: string): string {
  if (!memid.endsWith(SYNTH_FLAGS_SUFFIX)) {
    return ''
  }
  return memid.slice(0, -SYNTH_FLAGS_SUFFIX.length)
}
