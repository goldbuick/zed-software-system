import {
  iswanixbundlefile,
  iswanixwasmfile,
} from 'zss/feature/wanix/wanixfilematch'

describe('iswanixwasmfile', () => {
  it('matches .wasm extension', () => {
    expect(iswanixwasmfile('hello.wasm', new Uint8Array(0))).toBe(true)
    expect(iswanixwasmfile('HELLO.WASM', new Uint8Array(0))).toBe(true)
  })

  it('matches wasm magic bytes', () => {
    const bytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00])
    expect(iswanixwasmfile('blob', bytes)).toBe(true)
  })

  it('rejects non-wasm', () => {
    expect(iswanixwasmfile('hello.txt', new Uint8Array([1, 2, 3]))).toBe(false)
  })
})

describe('iswanixbundlefile', () => {
  it('matches .tgz and .tar.gz', () => {
    expect(iswanixbundlefile('app.tgz')).toBe(true)
    expect(iswanixbundlefile('app.tar.gz')).toBe(true)
    expect(iswanixbundlefile('APP.TGZ')).toBe(true)
  })

  it('rejects other extensions', () => {
    expect(iswanixbundlefile('app.zip')).toBe(false)
    expect(iswanixbundlefile('app.wasm')).toBe(false)
  })
})
