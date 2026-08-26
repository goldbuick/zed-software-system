import {
  HUMANIZE_SEC,
  humanizeonset,
} from 'zss/feature/synth/backend/wasm/playhumanize'

describe('playhumanize', () => {
  it('stays within plus or minus HUMANIZE_SEC', () => {
    expect(humanizeonset(10, () => 0)).toBeCloseTo(10 - HUMANIZE_SEC, 10)
    expect(humanizeonset(10, () => 1)).toBeCloseTo(10 + HUMANIZE_SEC, 10)
    expect(humanizeonset(10, () => 0.5)).toBeCloseTo(10, 10)
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
