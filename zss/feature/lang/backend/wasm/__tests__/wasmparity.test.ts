import manifest from '../__fixtures__/parity/manifest.json'
import { readfixture, runnativeparitygate } from '../langparityload'

type FIXTURE_MANIFEST = string[]

describe('lang parity fixtures manifest', () => {
  it('includes expected fixture ids', () => {
    const ids = manifest as FIXTURE_MANIFEST
    expect(ids).toContain('if_break')
    expect(ids).toContain('comparison_chain')
    expect(ids.length).toBe(15)
  })

  it('has js, map, and labels for every manifest entry', () => {
    for (const id of manifest as FIXTURE_MANIFEST) {
      expect(readfixture(id, 'zss').length).toBeGreaterThanOrEqual(0)
      expect(readfixture(id, 'map.json').length).toBeGreaterThan(2)
      expect(readfixture(id, 'labels.json').length).toBeGreaterThan(2)
    }
  })
})

describe('lang native compile parity', () => {
  it('matches TS oracle fixtures for all scripts', () => {
    const out = runnativeparitygate()
    expect(out).toContain('pass=15')
    expect(out).toContain('fail=0')
  })
})
