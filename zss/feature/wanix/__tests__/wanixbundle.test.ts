import { pickwanixbundleentry } from 'zss/feature/wanix/wanixbundle'

describe('pickwanixbundleentry', () => {
  it('prefers single wasm in bundle/', () => {
    expect(
      pickwanixbundleentry(['README'], ['hello.wasm']),
    ).toBe('bundle/hello.wasm')
  })

  it('keeps bundle/ prefix when already present', () => {
    expect(
      pickwanixbundleentry([], ['bundle/hello.wasm']),
    ).toBe('bundle/hello.wasm')
  })

  it('falls back to single root wasm', () => {
    expect(pickwanixbundleentry(['solo.wasm'], null)).toBe('solo.wasm')
  })

  it('errors when no single entry wasm', () => {
    expect(() => pickwanixbundleentry(['a.wasm', 'b.wasm'], null)).toThrow(
      'bundle has no single entry wasm',
    )
    expect(() => pickwanixbundleentry([], ['a.wasm', 'b.wasm'])).toThrow(
      'bundle has no single entry wasm',
    )
  })
})
