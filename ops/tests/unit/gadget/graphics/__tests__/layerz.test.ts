import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'

describe('normalizelayerzvariant', () => {
  it('maps known modes case-insensitively with trim', () => {
    expect(normalizelayerzvariant('ISO')).toBe('iso')
    expect(normalizelayerzvariant('  FPV  ')).toBe('fpv')
    expect(normalizelayerzvariant('Mode7')).toBe('mode7')
    expect(normalizelayerzvariant('FLAT')).toBe('flat')
  })

  it('falls back to flat for unknown or empty', () => {
    expect(normalizelayerzvariant('')).toBe('flat')
    expect(normalizelayerzvariant('3d')).toBe('flat')
    expect(normalizelayerzvariant(undefined)).toBe('flat')
    expect(normalizelayerzvariant(42)).toBe('flat')
  })
})
