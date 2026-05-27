import { tonenotationseconds } from 'zss/feature/synth/playnotation'

import { createwasmsynth } from '../maxisynth'
import { createmockmaxi } from '../testhelpers/mockmaxi'
import { WASM_VOICES_SAB } from '../wasmsabchannels'

describe('wasm bgplay volume', () => {
  it('calls bgplay volume hook', () => {
    const { maxi } = createmockmaxi()
    let pushed = -1
    const synth = createwasmsynth(maxi as any, {
      setbgplayvolume: (volume) => {
        pushed = volume
      },
    })
    synth.setbgplayvolume(50)
    expect(synth.getbgplayvolume()).toBe(50)
    expect(pushed).toBe(50)
    synth.destroy()
  })

  it('schedules plain bgplay on channel 4 after ~50ms', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addbgplay('c', '')
    maxi.advance(50)
    jest.advanceTimersByTime(50)
    const voices = snapshot(WASM_VOICES_SAB)
    expect(voices[24]).toBeGreaterThan(0)
    expect(voices[25]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('schedules bgplayon at next @16n grid boundary', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    const subdiv16 = tonenotationseconds('16n')
    synth.addbgplay('c', '@16n')
    maxi.advance(subdiv16 * 500)
    jest.advanceTimersByTime(subdiv16 * 500)
    expect(snapshot(WASM_VOICES_SAB)[25]).toBe(0)
    maxi.advance(subdiv16 * 500 + 1)
    jest.advanceTimersByTime(subdiv16 * 500 + 1)
    const voices = snapshot(WASM_VOICES_SAB)
    expect(voices[24]).toBeGreaterThan(0)
    expect(voices[25]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })

  it('rejects non-@ quantize strings for bgplayon', () => {
    const { maxi } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    expect(() => synth.addbgplay('c', '+0.05')).toThrow(/@ notation/)
    expect(() => synth.addbgplay('c', '8n')).toThrow(/@ notation/)
    synth.destroy()
  })

  it('schedules main play on channel 0', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c')
    jest.advanceTimersByTime(1)
    const voices = snapshot(WASM_VOICES_SAB)
    expect(voices[0]).toBeGreaterThan(0)
    expect(voices[1]).toBe(1)
    expect(voices[24]).toBe(0)
    synth.destroy()
    jest.useRealTimers()
  })

  it('keeps play and bgplay on separate channels', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('c')
    synth.addbgplay('e', '')
    maxi.advance(50)
    jest.advanceTimersByTime(50)
    const voices = snapshot(WASM_VOICES_SAB)
    expect(voices[1]).toBe(1)
    expect(voices[25]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })
})
