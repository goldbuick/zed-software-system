import {
  ZNS_LOGIN_CODE_PARAM,
  ZNS_LOGIN_EMAIL_PARAM,
  ZNS_LOGIN_NAMESPACE_PARAM,
  clearznsloginparamsfromurl,
  readznsloginparamsfromurl,
} from 'zss/feature/url'

describe('readznslogincodefromurl', () => {
  let href = 'https://zed.cafe/'

  beforeEach(() => {
    href = 'https://zed.cafe/'
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      get() {
        return new URL(href)
      },
    })
  })

  it('returns code from zns-code query param', () => {
    href = 'https://zed.cafe/?zns-code=788362'
    expect(readznsloginparamsfromurl()?.code).toBe('788362')
  })

  it('returns email and namespace for cross-device links', () => {
    href =
      'https://zed.cafe/?zns-code=788362&zns-email=user%40example.com&zns-namespace=docs'
    expect(readznsloginparamsfromurl()).toEqual({
      code: '788362',
      email: 'user@example.com',
      namespace: 'docs',
    })
  })

  it('rejects non-six-digit values', () => {
    href = 'https://zed.cafe/?zns-code=12'
    expect(readznsloginparamsfromurl()).toBeUndefined()
    href = 'https://zed.cafe/?zns-code=abcdef'
    expect(readznsloginparamsfromurl()).toBeUndefined()
  })
})

describe('clearznsloginparamsfromurl', () => {
  let href =
    'https://zed.cafe/?zns-code=788362&zns-email=user%40example.com&zns-namespace=docs&foo=bar#hash'

  beforeEach(() => {
    href =
      'https://zed.cafe/?zns-code=788362&zns-email=user%40example.com&zns-namespace=docs&foo=bar#hash'
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      get() {
        return new URL(href)
      },
    })
    Object.defineProperty(globalThis, 'history', {
      configurable: true,
      value: {
        replaceState(
          _state: unknown,
          _title: string,
          next?: string | URL | null,
        ) {
          const raw = String(next ?? href)
          href = raw.startsWith('http')
            ? raw
            : `https://zed.cafe${raw.startsWith('/') ? '' : '/'}${raw}`
        },
      },
    })
  })

  it('removes zns login params from the url', () => {
    clearznsloginparamsfromurl()
    const url = new URL(href)
    expect(url.searchParams.has(ZNS_LOGIN_CODE_PARAM)).toBe(false)
    expect(url.searchParams.has(ZNS_LOGIN_EMAIL_PARAM)).toBe(false)
    expect(url.searchParams.has(ZNS_LOGIN_NAMESPACE_PARAM)).toBe(false)
    expect(url.searchParams.get('foo')).toBe('bar')
    expect(url.hash).toBe('#hash')
  })
})
