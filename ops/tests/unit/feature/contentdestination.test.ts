import {
  clearcrossloginflags,
  readcrossloginflags,
  setcrossloginflags,
  takecrossloginflags,
} from 'zss/feature/crosslogin'
import {
  iscontentdestination,
  ishostcontenturl,
  parsecontentdestination,
  resolvebytesdestination,
} from 'zss/feature/url'

describe('parsecontentdestination', () => {
  it('parses https bytes url', () => {
    expect(parsecontentdestination('https://bytes.zed.cafe/abc123XY')).toEqual({
      kind: 'bytes',
      key: 'abc123XY',
      raw: 'https://bytes.zed.cafe/abc123XY',
    })
  })

  it('parses bare bytes host path', () => {
    expect(parsecontentdestination('bytes.zed.cafe/aBcD1x2y')).toEqual({
      kind: 'bytes',
      key: 'aBcD1x2y',
      raw: 'bytes.zed.cafe/aBcD1x2y',
    })
  })

  it('rejects board names and join urls', () => {
    expect(parsecontentdestination('title')).toBeUndefined()
    expect(parsecontentdestination('room1x0')).toBeUndefined()
    expect(
      parsecontentdestination('https://zed.cafe/join/#AbCd_12'),
    ).toBeUndefined()
    expect(parsecontentdestination('wil.at.zed.cafe/peer')).toBeUndefined()
    expect(iscontentdestination('')).toBe(false)
  })

  it('rejects invalid keys', () => {
    expect(parsecontentdestination('https://bytes.zed.cafe/ab')).toBeUndefined()
    expect(
      parsecontentdestination('https://bytes.zed.cafe/bad_key!'),
    ).toBeUndefined()
  })
})

describe('ishostcontenturl', () => {
  it('accepts zed.cafe hash content', () => {
    expect(ishostcontenturl(new URL('https://zed.cafe/#compressed'))).toBe(
      true,
    )
    expect(
      ishostcontenturl(new URL('https://localhost:7777/#compressed')),
    ).toBe(true)
  })

  it('rejects join urls and empty hash', () => {
    expect(ishostcontenturl(new URL('https://zed.cafe/join/#peer1'))).toBe(
      false,
    )
    expect(ishostcontenturl(new URL('https://zed.cafe/'))).toBe(false)
    expect(ishostcontenturl(new URL('https://example.com/#x'))).toBe(false)
  })
})

describe('resolvebytesdestination', () => {
  const originalfetch = global.fetch

  afterEach(() => {
    global.fetch = originalfetch
  })

  it('parses location assign from bytes HTML', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            `<script>location = 'https://zed.cafe/#bookpayload';</script>`,
          ),
      } as Response),
    ) as typeof fetch

    const dest = parsecontentdestination('https://bytes.zed.cafe/abcd1234')
    expect(dest).toBeDefined()
    const target = await resolvebytesdestination(dest!)
    expect(target?.href).toBe('https://zed.cafe/#bookpayload')
  })

  it('returns undefined when fetch fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, text: () => Promise.resolve('') } as Response),
    ) as typeof fetch
    const dest = parsecontentdestination('https://bytes.zed.cafe/abcd1234')
    await expect(resolvebytesdestination(dest!)).resolves.toBeUndefined()
  })
})

describe('crosslogin flags sessionStorage', () => {
  const store = new Map<string, string>()

  beforeAll(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
      },
    })
  })

  beforeEach(() => {
    store.clear()
    clearcrossloginflags()
  })

  afterEach(() => {
    clearcrossloginflags()
    store.clear()
  })

  it('survives in-memory clear via sessionStorage on take', () => {
    setcrossloginflags({ health: 9, ammo: 2 })
    expect(readcrossloginflags()).toEqual({ health: 9, ammo: 2 })
    const first = takecrossloginflags()
    expect(first).toEqual({ health: 9, ammo: 2 })
    expect(takecrossloginflags()).toBeUndefined()
    expect(readcrossloginflags()).toBeUndefined()
  })

  it('reads sessionStorage when memory is empty', () => {
    clearcrossloginflags()
    store.set(
      'zss.crosslogin.flags',
      JSON.stringify({ gems: 3, torch: 1 }),
    )
    expect(takecrossloginflags()).toEqual({ gems: 3, torch: 1 })
    expect(store.has('zss.crosslogin.flags')).toBe(false)
  })
})
