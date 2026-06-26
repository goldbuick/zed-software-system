import { BRICK_BASE, brickproxiedurl } from 'zss/feature/brickurl'

function base64urldecode(input: string): string {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) {
    b64 += '='
  }
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

describe('brickproxiedurl', () => {
  it('uses base64url brick param without percent encoding', () => {
    const proxied = brickproxiedurl('https://museumofzzt.com/foo')
    expect(proxied).toMatch(
      /^https:\/\/brick\.zed\.cafe\/\?brick=[A-Za-z0-9_-]+$/,
    )
    expect(proxied).not.toContain('%')
  })

  it('round-trips absolute http(s) urls through base64url', () => {
    const upstream =
      'https://museumofzzt.com/api/v1/search/files/?offset=0&title=foo'
    const proxied = brickproxiedurl(upstream)
    const parsed = new URL(proxied)
    expect(parsed.origin).toBe(BRICK_BASE)
    const brick = parsed.searchParams.get('brick')
    expect(brick).toBeTruthy()
    expect(base64urldecode(brick!)).toBe(upstream)
  })

  it('passes through data and blob urls unchanged', () => {
    expect(brickproxiedurl('data:image/png;base64,abc')).toBe(
      'data:image/png;base64,abc',
    )
    expect(brickproxiedurl('blob:https://zed.cafe/abc')).toBe(
      'blob:https://zed.cafe/abc',
    )
  })

  it('passes through already-proxied brick urls unchanged', () => {
    const existing = `${BRICK_BASE}/?brick=aHR0cHM6Ly9leGFtcGxlLmNvbQ`
    expect(brickproxiedurl(existing)).toBe(existing)
  })
})
