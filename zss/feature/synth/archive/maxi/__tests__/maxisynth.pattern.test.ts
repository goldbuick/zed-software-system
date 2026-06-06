import { invokeplay, parseplay } from 'zss/feature/synth/playnotation'

import { createwasmsynth } from 'zss/feature/synth/archive/maxi/maxisynth'
import { wasmsabsnapshot } from 'zss/feature/synth/backend/wasm/sabpush'
import { createmockmaxi } from 'zss/feature/synth/archive/maxi/testhelpers/mockmaxi'
import { WASM_DRUM_COUNT } from 'zss/feature/synth/backend/wasm/wasmsabchannels'

describe('wasm drum pattern', () => {
  it('schedules all play drums from 0x1x2xpx4x5x6x7x8x9xkr', () => {
    jest.useFakeTimers()
    const { maxi } = createmockmaxi()
    const maxiwithclock = maxi as typeof maxi & {
      advance: (ms: number) => void
    }
    const synth = createwasmsynth(maxi as any)
    const invoke = parseplay('0x1x2xpx4x5x6x7x8x9xkr')[0]
    const pattern = invokeplay(0, 0, invoke, true)
    const drums = pattern
      .filter(
        ([, value]) =>
          typeof value[2] === 'number' &&
          value[2] >= 0 &&
          value[2] < WASM_DRUM_COUNT,
      )
      .map(([time, value]) => [time, value[2]] as const)

    expect(drums.map(([, id]) => id).sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])

    synth.addplay('0x1x2xpx4x5x6x7x8x9xkr')
    const peak = new Array(WASM_DRUM_COUNT).fill(0)
    for (let step = 0; step < 50; step++) {
      maxiwithclock.advance(100)
      jest.advanceTimersByTime(100)
      const row = wasmsabsnapshot('zss_drums')
      for (let i = 0; i < WASM_DRUM_COUNT; i++) {
        peak[i] = Math.max(peak[i], row[i] ?? 0)
      }
    }
    expect(peak).toEqual(new Array(WASM_DRUM_COUNT).fill(1))
    synth.destroy()
    jest.useRealTimers()
  })
})
