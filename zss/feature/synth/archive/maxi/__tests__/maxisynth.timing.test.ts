import {
  invokeplay,
  parseplay,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'

import { createwasmsynth } from 'zss/feature/synth/archive/maxi/maxisynth'
import { setwasmsabwritehook } from 'zss/feature/synth/backend/wasm/sabpush'
import { createmockmaxi } from 'zss/feature/synth/archive/maxi/testhelpers/mockmaxi'
import { WASM_VOICES_SAB } from 'zss/feature/synth/backend/wasm/wasmsabchannels'

describe('wasm play timing', () => {
  it('starts semicolon voices on the same beat', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c;e')
    jest.advanceTimersByTime(1)
    const voices = snapshot(WASM_VOICES_SAB)
    expect(voices[1]).toBe(1)
    expect(voices[7]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('staggers consecutive addplay by last pattern time, not extra 8n', () => {
    jest.useFakeTimers()
    const gateat: number[] = []
    const { maxi, getclock } = createmockmaxi()
    setwasmsabwritehook((channelid, view) => {
      if (channelid === WASM_VOICES_SAB && view[1] === 1) {
        gateat.push(getclock())
      }
    })
    const maxiwithclock = maxi as typeof maxi & {
      advance: (ms: number) => void
    }
    const synth = createwasmsynth(maxi as any)
    const pattern1 = invokeplay(0, 0, parseplay('c')[0], true)
    const nextstart = pattern1[pattern1.length - 1]?.[0] ?? 0

    synth.addplay('c')
    synth.addplay('e')

    maxiwithclock.advance(1)
    jest.advanceTimersByTime(1)
    expect(gateat).toEqual([0])

    maxiwithclock.advance(Math.max(0, nextstart * 1000))
    jest.advanceTimersByTime(Math.max(0, nextstart * 1000))
    expect(gateat[0]).toBe(0)
    expect(gateat[1] ?? 0).toBeLessThan(
      nextstart + tonenotationseconds('8n') * 0.5,
    )
    expect(Math.abs((gateat[1] ?? 0) - nextstart)).toBeLessThan(0.01)

    synth.destroy()
    jest.useRealTimers()
  })
})
