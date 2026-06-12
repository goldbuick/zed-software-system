import { normalizewanixcmd } from 'zss/feature/wanix/wanixcmd'

describe('normalizewanixcmd', () => {
  it('maps hello.wasm smoke binary to root path', () => {
    expect(normalizewanixcmd('hello.wasm')).toBe('hello.wasm')
  })

  it('maps other bare wasm names into bundle/', () => {
    expect(normalizewanixcmd('other.wasm')).toBe('bundle/other.wasm')
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

  it('returns empty for blank input', () => {
    expect(normalizewanixcmd('')).toBe('')
    expect(normalizewanixcmd('   ')).toBe('')
  })
})
