import { createwasmsynth } from 'ops/archive/synth/maxi/maxisynth'
import { createmockmaxi } from 'ops/tests/lib/synth/mockmaxi'
import {
  WASM_DRUM_COUNT,
  WASM_DRUM_SAB_LEN,
} from 'zss/feature/synth/backend/wasm/wasmsabchannels'
import {
  invokeplay,
  parseplay,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'

describe('wasm drum scheduling', () => {
  it('increments drum strike counters for digit notes', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('0')
    const drums = snapshot('zss_drums')
    expect(drums[0]).toBe(1)
    expect(drums).toHaveLength(WASM_DRUM_SAB_LEN)
    expect(drums[WASM_DRUM_COUNT]).toBeCloseTo(tonenotationseconds('16n'), 4)
    synth.destroy()
    jest.useRealTimers()
  })

  it('warmdrums increments all drum strike counters', () => {
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.warmdrums()
    const drums = snapshot('zss_drums')
    expect(drums).toHaveLength(WASM_DRUM_SAB_LEN)
    for (let i = 0; i < WASM_DRUM_COUNT; i++) {
      expect(drums[i]).toBe(1)
    }
    synth.destroy()
  })

  it('schedules crash and ride from k and r play chars', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const maxiwithclock = maxi as typeof maxi & {
      advance: (ms: number) => void
    }
    const synth = createwasmsynth(maxi as any)
    synth.addplay('kr')
    for (let step = 0; step < 20; step++) {
      maxiwithclock.advance(100)
      jest.advanceTimersByTime(100)
    }
    const drums = snapshot('zss_drums')
    expect(drums[10]).toBe(1)
    expect(drums[11]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('parseplay maps k and r to drum ids 10 and 11', () => {
    const invoke = parseplay('kr')[0]
    const pattern = invokeplay(0, 0, invoke, false)
    expect(pattern.map(([, value]) => value[2])).toEqual([10, 11])
  })

  it('passes pattern note duration for cowbell hits', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('2')
    const drums = snapshot('zss_drums')
    expect(drums[2]).toBe(1)
    expect(drums[WASM_DRUM_COUNT + 2]).toBeGreaterThan(0)
    synth.destroy()
    jest.useRealTimers()
  })
})
