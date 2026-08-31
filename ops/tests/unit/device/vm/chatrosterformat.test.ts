import {
  formatchatrosterlines,
  sanitizechatrostername,
} from 'zss/device/vm/chatrosterformat'

describe('chatrosterformat', () => {
  it('sanitizechatrostername strips colon pipe and newlines', () => {
    expect(sanitizechatrostername(' a:b\nc ')).toBe('abc')
    expect(sanitizechatrostername(' a|b ')).toBe('ab')
    expect(sanitizechatrostername('   ')).toBe('player')
  })

  it('formatchatrosterlines sorts most recent first as name:seconds', () => {
    const now = 1_000_000
    const body = formatchatrosterlines(
      [
        { name: 'alice', lastseenms: now - 12_000 },
        { name: 'bob', lastseenms: now },
        { name: 'carol', lastseenms: now - 305_000 },
      ],
      now,
    )
    expect(body).toBe(['bob:0', 'alice:12', 'carol:305'].join('\n'))
  })

  it('formatchatrosterlines drops idle over 3600s', () => {
    const now = 10_000_000
    const body = formatchatrosterlines(
      [
        { name: 'fresh', lastseenms: now - 1_000 },
        { name: 'stale', lastseenms: now - 3_601_000 },
      ],
      now,
    )
    expect(body).toBe('fresh:1')
  })
})
