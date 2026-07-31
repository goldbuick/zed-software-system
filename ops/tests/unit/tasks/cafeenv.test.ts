import {
  mergecafeenv,
  parseenvfilecontents,
} from 'tasks/lib/cafeenv'

describe('cafeenv', () => {
  it('parses keys and ignores # and // comments', () => {
    const parsed = parseenvfilecontents(`
# comment
// also comment
ZNS_EMAIL=a@b.c
ZNS_TOKEN="tok en"
ZSS_HMR_ONLY=false
not a line
=bad
`)
    expect(parsed).toEqual({
      ZNS_EMAIL: 'a@b.c',
      ZNS_TOKEN: 'tok en',
      ZSS_HMR_ONLY: 'false',
    })
  })

  it('mergecafeenv lets caller env override file values', () => {
    const env = mergecafeenv('/nonexistent-root-xyz', {
      ZNS_EMAIL: 'from-shell',
      PATH: '/bin',
    })
    expect(env.ZNS_EMAIL).toBe('from-shell')
    expect(env.PATH).toBe('/bin')
  })
})
