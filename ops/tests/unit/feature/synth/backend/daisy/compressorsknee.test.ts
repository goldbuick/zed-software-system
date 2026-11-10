import { compressorskneedb } from 'zss/feature/synth/backend/daisy/compressorsknee'

describe('compressorskneedb', () => {
  const ratio = 4
  const knee = 30
  const halfknee = knee * 0.5

  it('returns zero below the soft knee and never expands', () => {
    expect(compressorskneedb(-halfknee, ratio, knee)).toBe(0)
    expect(compressorskneedb(-halfknee - 1, ratio, knee)).toBe(0)
    expect(compressorskneedb(-1, ratio, knee)).toBeGreaterThanOrEqual(0)
    expect(compressorskneedb(0, ratio, knee)).toBeGreaterThan(0)
    expect(compressorskneedb(halfknee / 2, ratio, knee)).toBeGreaterThan(0)
  })

  it('matches hard knee at halfknee (continuity)', () => {
    const soft = compressorskneedb(halfknee, ratio, knee)
    const hard = halfknee * (1 - 1 / ratio)
    expect(soft).toBeCloseTo(hard, 6)
    expect(compressorskneedb(halfknee + 6, ratio, knee)).toBeCloseTo(
      (halfknee + 6) * (1 - 1 / ratio),
      6,
    )
  })

  it('hard-knees when knee is disabled', () => {
    expect(compressorskneedb(8, ratio, 0)).toBeCloseTo(8 - 8 / ratio, 6)
    expect(compressorskneedb(-1, ratio, 0)).toBe(0)
  })
})
