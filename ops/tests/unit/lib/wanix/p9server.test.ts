import {
  readwanixp9serverdir,
  resolvewanixp9servertls,
  WANIX_P9SERVER_DEFAULT_DIR,
} from 'ops/lib/wanix/p9server'

describe('wanix p9server argv', () => {
  it('readwanixp9serverdir takes first positional path', () => {
    expect(readwanixp9serverdir(['--', '/tmp/sync'])).toBe('/tmp/sync')
    expect(readwanixp9serverdir(['/tmp/a'])).toBe('/tmp/a')
  })

  it('readwanixp9serverdir skips -dir flag value', () => {
    expect(readwanixp9serverdir(['-dir', '/tmp/flagged', '/tmp/pos'])).toBe(
      '/tmp/pos',
    )
  })

  it('readwanixp9serverdir returns undefined when empty', () => {
    expect(readwanixp9serverdir([])).toBeUndefined()
    expect(WANIX_P9SERVER_DEFAULT_DIR).toContain('serve-root')
  })

  it('resolvewanixp9servertls returns cert/key when mkcert files exist', () => {
    const tls = resolvewanixp9servertls()
    if (!tls) {
      return
    }
    expect(tls.cert).toContain('.vite-plugin-mkcert')
    expect(tls.cert.endsWith('cert.pem')).toBe(true)
    expect(tls.key.endsWith('dev.pem')).toBe(true)
  })
})
