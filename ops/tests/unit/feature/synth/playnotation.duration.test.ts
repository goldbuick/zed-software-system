import {
  durationnotation,
  durationseconds,
  parsetimeseconds,
  rejointonenotation,
  tonenotationcandidates,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'
import { DEFAULT_BPM } from 'zss/mapping/tick'

const EPS = 1e-9

describe('playnotation duration helpers', () => {
  it('durationseconds matches the 64n-at-BPM formula', () => {
    for (let d = 1; d <= 128; d++) {
      const expected = (d * 60) / (16 * DEFAULT_BPM)
      expect(durationseconds(d)).toBeCloseTo(expected, 12)
    }
  })

  it('tonenotationcandidates matches Tone toNotation() candidate list shape', () => {
    const c = tonenotationcandidates()
    expect(c[0]).toBe('1m')
    expect(c[c.length - 1]).toBe('0')
    expect(c).toHaveLength(1 + 8 * 3 + 1)
  })

  it('durationnotation is globally optimal and uses first-min tie-break (Tone rules)', () => {
    const candidates = tonenotationcandidates()
    for (let d = 1; d <= 128; d++) {
      const t = durationseconds(d)
      const n = durationnotation(d)
      const en = Math.abs(tonenotationseconds(n) - t)

      for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i]
        if (cand === undefined) {
          continue
        }
        const err = Math.abs(tonenotationseconds(cand) - t)
        expect(err + EPS).toBeGreaterThanOrEqual(en)
      }

      const idx = candidates.indexOf(n)
      expect(idx).toBeGreaterThanOrEqual(0)
      for (let i = 0; i < idx; i++) {
        const before = candidates[i]
        if (before === undefined) {
          continue
        }
        const ei = Math.abs(tonenotationseconds(before) - t)
        expect(ei).toBeGreaterThan(en - EPS)
      }
    }
  })

  it('parsetimeseconds treats numbers as seconds and strings as notation', () => {
    expect(parsetimeseconds(1)).toBe(1)
    expect(parsetimeseconds('8n')).toBeCloseTo(tonenotationseconds('8n'), 12)
    expect(parsetimeseconds('128n')).toBeCloseTo(
      tonenotationseconds('128n'),
      12,
    )
    expect(parsetimeseconds('not-a-time')).toBeUndefined()
  })

  it('rejointonenotation rebuilds lang-split Tone suffixes', () => {
    expect(rejointonenotation(16, 'n')).toBe('16n')
    expect(rejointonenotation(1, 'n')).toBe('1n')
    expect(rejointonenotation(8, 'n.')).toBe('8n.')
    expect(rejointonenotation(4, 't')).toBe('4t')
    expect(rejointonenotation(1, 'm')).toBe('1m')
    expect(rejointonenotation(16, 'north')).toBe(16)
    expect(rejointonenotation('16n', 'n')).toBe('16n')
    expect(parsetimeseconds(rejointonenotation(16, 'n') as string)).toBeCloseTo(
      tonenotationseconds('16n'),
      12,
    )
  })

})
