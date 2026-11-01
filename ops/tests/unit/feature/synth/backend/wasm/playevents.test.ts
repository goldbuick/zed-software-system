import {
  PLAY_EVENT_NOTE_OFF,
  PLAY_EVENT_NOTE_ON,
  PLAY_RING_CAP,
  PLAY_RING_LEN,
  type PLAY_EVENT,
  applyplayblock,
  packplayring,
  playsampleindex,
} from 'zss/feature/synth/backend/wasm/playevents'
import {
  WASM_PLAY_RING_CAP,
  WASM_PLAY_SAB_LEN,
} from 'zss/feature/synth/backend/wasm/wasmsabchannels'

const SAMPLERATE = 48000
const FRAMES = 128

function event(
  partial: Partial<PLAY_EVENT> & Pick<PLAY_EVENT, 'when' | 'id'>,
): PLAY_EVENT {
  return {
    kind: PLAY_EVENT_NOTE_ON,
    chan: 0,
    param: 440,
    noteid: partial.id,
    strike: 1,
    ...partial,
  }
}

describe('playsampleindex', () => {
  const blockstart = 10

  it('lands past events on sample 0', () => {
    expect(
      playsampleindex(blockstart - 0.01, blockstart, FRAMES, SAMPLERATE),
    ).toBe(0)
    expect(playsampleindex(blockstart, blockstart, FRAMES, SAMPLERATE)).toBe(
      0,
    )
  })

  it('lands an in-block time on that sample', () => {
    const when = blockstart + 10 / SAMPLERATE
    expect(playsampleindex(when, blockstart, FRAMES, SAMPLERATE)).toBe(
      10,
    )
  })

  it('returns -1 when the event is still in the next block', () => {
    const when = blockstart + FRAMES / SAMPLERATE
    expect(playsampleindex(when, blockstart, FRAMES, SAMPLERATE)).toBe(
      -1,
    )
  })
})

describe('applyplayblock', () => {
  it('applies each event on its sample and keeps the gate owner', () => {
    const blockstart = 2
    const active = new Map<number, number>()
    const seen = new Set<number>()
    const on = event({
      kind: PLAY_EVENT_NOTE_ON,
      when: blockstart + 5 / SAMPLERATE,
      id: 1,
      noteid: 7,
    })
    const off = event({
      kind: PLAY_EVENT_NOTE_OFF,
      when: blockstart + 40 / SAMPLERATE,
      id: 2,
      noteid: 7,
    })
    const applied = applyplayblock(
      [off, on],
      blockstart,
      FRAMES,
      SAMPLERATE,
      active,
      seen,
    )
    expect(applied.map((item) => item.sample)).toEqual([5, 40])
    expect(applied[0].event.id).toBe(1)
    expect(applied[1].event.id).toBe(2)
    expect(active.has(0)).toBe(false)
    expect(seen.has(1)).toBe(true)
    expect(seen.has(2)).toBe(true)
  })

  it('does not let a stale note-off clear a newer note', () => {
    const active = new Map<number, number>([[0, 2]])
    const seen = new Set<number>()
    const stale = event({
      kind: PLAY_EVENT_NOTE_OFF,
      when: 1,
      id: 1,
      noteid: 1,
    })
    const applied = applyplayblock(
      [stale],
      1,
      FRAMES,
      SAMPLERATE,
      active,
      seen,
    )
    expect(applied).toEqual([])
    expect(active.get(0)).toBe(2)
    expect(seen.has(1)).toBe(true)
  })
})

describe('packplayring', () => {
  it('matches the sab channel length and keeps the soonest events', () => {
    expect(PLAY_RING_CAP).toBe(WASM_PLAY_RING_CAP)
    expect(PLAY_RING_LEN).toBe(WASM_PLAY_SAB_LEN)
    const events: PLAY_EVENT[] = []
    for (let i = 0; i < PLAY_RING_CAP + 2; i++) {
      events.push(event({ when: i, id: i + 1 }))
    }
    const packed = packplayring(3, events)
    expect(packed).toHaveLength(PLAY_RING_LEN)
    expect(packed[0]).toBe(3)
    expect(packed[1]).toBe(PLAY_RING_CAP)
  })
})
