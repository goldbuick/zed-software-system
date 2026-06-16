import { normalizewanixcmd } from 'zss/feature/wanix/wanixcmd'

describe('normalizewanixcmd', () => {
  it('passes through bare wasm filename', () => {
    expect(normalizewanixcmd('hello.wasm')).toBe('hello.wasm')
  })

  it('strips surrounding double quotes', () => {
    expect(normalizewanixcmd('"hello.wasm"')).toBe('hello.wasm')
  })

  it('strips surrounding single quotes', () => {
    expect(normalizewanixcmd("'hello.wasm'")).toBe('hello.wasm')
  })

  it('passes through bundle/ prefix', () => {
    expect(normalizewanixcmd('bundle/hello.wasm')).toBe('bundle/hello.wasm')
  })

  it('passes through kernel #bundle paths', () => {
    expect(normalizewanixcmd('#bundle/hello.wasm')).toBe('#bundle/hello.wasm')
  })

  it('strips leading slashes', () => {
    expect(normalizewanixcmd('/hello.wasm')).toBe('hello.wasm')
  })

  it('returns empty for blank input', () => {
    expect(normalizewanixcmd('')).toBe('')
    expect(normalizewanixcmd('   ')).toBe('')
  })
})
