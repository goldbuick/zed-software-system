/**
 * Live #play / #bgplay event ring.
 * Sample rules match native/zss/zss_playevents.cpp.
 */

export const PLAY_EVENT_NOTE_ON = 1
export const PLAY_EVENT_NOTE_OFF = 2
export const PLAY_EVENT_DRUM = 3

export const PLAY_RING_CAP = 32
export const PLAY_EVENT_STRIDE = 7
export const PLAY_RING_HEADER = 2
export const PLAY_RING_LEN =
  PLAY_RING_HEADER + PLAY_RING_CAP * PLAY_EVENT_STRIDE

/**
 * Keep a due event in the ring until the audio thread has sampled it.
 * Longer than one dsp wake (~11ms) so one missed tick does not drop it.
 */
export const PLAY_EVENT_HOLD_SEC = 0.03

export const PLAY_RING_GENERATION = 0
export const PLAY_RING_COUNT = 1

export const PLAY_SLOT_KIND = 0
export const PLAY_SLOT_CHAN = 1
export const PLAY_SLOT_WHEN = 2
export const PLAY_SLOT_PARAM = 3
export const PLAY_SLOT_NOTEID = 4
export const PLAY_SLOT_ID = 5
export const PLAY_SLOT_STRIKE = 6

export type PLAY_EVENT = {
  kind: number
  chan: number
  when: number
  param: number
  noteid: number
  id: number
  strike: number
}

export type PLAY_APPLY = {
  sample: number
  event: PLAY_EVENT
}

export function sortplayevents(events: PLAY_EVENT[]): PLAY_EVENT[] {
  return [...events].sort((a, b) => {
    if (a.when !== b.when) {
      return a.when - b.when
    }
    return a.id - b.id
  })
}

/**
 * Sample index inside a block where playtimesec() first reaches `when`.
 * Times at or before the block start land on sample 0.
 * Returns -1 when the event is still in the future for this block.
 */
export function playsampleindex(
  when: number,
  blockstart: number,
  frames: number,
  samplerate: number,
): number {
  if (frames <= 0 || samplerate <= 0) {
    return -1
  }
  if (when <= blockstart) {
    return 0
  }
  const ticks = (when - blockstart) * samplerate
  const sample = Math.ceil(ticks - 1e-6)
  if (sample >= frames) {
    return -1
  }
  return sample
}

/**
 * Apply one audio block. Mutates `activegate` and `seenids`.
 * A note-off whose note id is no longer the channel owner is consumed and
 * does not clear the newer note.
 */
export function applyplayblock(
  events: PLAY_EVENT[],
  blockstart: number,
  frames: number,
  samplerate: number,
  activegate: Map<number, number>,
  seenids: Set<number>,
): PLAY_APPLY[] {
  const sorted = sortplayevents(events)
  const applied: PLAY_APPLY[] = []
  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i]
    if (seenids.has(event.id)) {
      continue
    }
    const sample = playsampleindex(
      event.when,
      blockstart,
      frames,
      samplerate,
    )
    if (sample < 0) {
      continue
    }
    seenids.add(event.id)
    if (event.kind === PLAY_EVENT_NOTE_OFF) {
      if (activegate.get(event.chan) !== event.noteid) {
        continue
      }
      activegate.delete(event.chan)
    } else if (event.kind === PLAY_EVENT_NOTE_ON) {
      activegate.set(event.chan, event.noteid)
    }
    applied.push({ sample, event })
  }
  return applied
}

/** Pack the soonest events into the zss_play SAB image. */
export function packplayring(
  generation: number,
  events: PLAY_EVENT[],
): number[] {
  const out = new Array<number>(PLAY_RING_LEN).fill(0)
  out[PLAY_RING_GENERATION] = generation
  const sorted = sortplayevents(events)
  const count = Math.min(sorted.length, PLAY_RING_CAP)
  out[PLAY_RING_COUNT] = count
  for (let i = 0; i < count; i++) {
    const event = sorted[i]
    const slot = PLAY_RING_HEADER + i * PLAY_EVENT_STRIDE
    out[slot + PLAY_SLOT_KIND] = event.kind
    out[slot + PLAY_SLOT_CHAN] = event.chan
    out[slot + PLAY_SLOT_WHEN] = event.when
    out[slot + PLAY_SLOT_PARAM] = event.param
    out[slot + PLAY_SLOT_NOTEID] = event.noteid
    out[slot + PLAY_SLOT_ID] = event.id
    out[slot + PLAY_SLOT_STRIKE] = event.strike
  }
  return out
}
