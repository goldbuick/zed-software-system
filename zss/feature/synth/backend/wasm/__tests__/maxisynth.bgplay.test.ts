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

  it('schedules bgplay on channel 4', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addbgplay('c', '+0.05')
    maxi.advance(50)
    jest.advanceTimersByTime(50)
    const voices = snapshot(WASM_VOICES_SAB)
    expect(voices[24]).toBeGreaterThan(0)
    expect(voices[25]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
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
    synth.addbgplay('e', '+0.05')
    maxi.advance(50)
    jest.advanceTimersByTime(50)
    const voices = snapshot(WASM_VOICES_SAB)
    expect(voices[1]).toBe(1)
    expect(voices[25]).toBe(1)
    synth.destroy()
    jest.useRealTimers()
  })
})
