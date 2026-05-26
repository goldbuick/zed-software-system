import { tonenotationseconds } from 'zss/feature/synth/playnotation'

import { createwasmsynth } from '../maxisynth'
import { createmockmaxi } from '../testhelpers/mockmaxi'

describe('wasm drum scheduling', () => {
  it('increments drum strike counters for digit notes', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('0')
    const drums = snapshot('zss_drums')
    expect(drums[0]).toBe(1)
    expect(drums).toHaveLength(20)
    expect(drums[10]).toBeCloseTo(tonenotationseconds('16n'), 4)
    synth.destroy()
    jest.useRealTimers()
  })

  it('warmdrums increments all drum strike counters', () => {
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.warmdrums()
    const drums = snapshot('zss_drums')
    expect(drums).toHaveLength(20)
    for (let i = 0; i < 10; i++) {
      expect(drums[i]).toBe(1)
    }
    synth.destroy()
  })

  it('passes pattern note duration for cowbell hits', () => {
    jest.useFakeTimers()
    const { maxi, snapshot } = createmockmaxi()
    const synth = createwasmsynth(maxi as any)
    synth.addplay('2')
    const drums = snapshot('zss_drums')
    expect(drums[2]).toBe(1)
    expect(drums[12]).toBeGreaterThan(0)
    synth.destroy()
    jest.useRealTimers()
  })
})
