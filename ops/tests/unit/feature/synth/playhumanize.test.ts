import {
  HUMANIZE_BGPLAY_SEC,
  HUMANIZE_SEC,
  humanizeonset,
} from 'zss/feature/synth/backend/wasm/playhumanize'
import { gateoffstillactive } from 'zss/feature/synth/backend/wasm/notegate'

describe('playhumanize', () => {
  it('stays within plus or minus HUMANIZE_SEC by default', () => {
    expect(humanizeonset(10, () => 0)).toBeCloseTo(10 - HUMANIZE_SEC, 10)
    expect(humanizeonset(10, () => 1)).toBeCloseTo(10 + HUMANIZE_SEC, 10)
    expect(humanizeonset(10, () => 0.5)).toBeCloseTo(10, 10)
  })

  it('uses peaksec override for bgplay-scale jitter', () => {
    expect(humanizeonset(10, () => 0, HUMANIZE_BGPLAY_SEC)).toBeCloseTo(
      10 - HUMANIZE_BGPLAY_SEC,
      10,
    )
    expect(humanizeonset(10, () => 1, HUMANIZE_BGPLAY_SEC)).toBeCloseTo(
      10 + HUMANIZE_BGPLAY_SEC,
      10,
    )
  })

  it('uses the injected rng', () => {
    let calls = 0
    const rng = () => {
      calls += 1
      return 0.25
    }
    expect(humanizeonset(1, rng)).toBeCloseTo(1 - HUMANIZE_SEC * 0.5, 10)
    expect(calls).toBe(1)
  })
})

describe('gateoffstillactive', () => {
  it('applies off only while noteid still owns the channel', () => {
    const active = new Map<number, number>()
    const chan = 4
    active.set(chan, 1)
    expect(gateoffstillactive(active, chan, 1)).toBe(true)
    active.set(chan, 2)
    expect(gateoffstillactive(active, chan, 1)).toBe(false)
    expect(gateoffstillactive(active, chan, 2)).toBe(true)
  })
})
