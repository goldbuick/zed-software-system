import { resolvedriverforwasm } from 'zss/device/wanix/spawndriver'
import { readwanixwasmdriver } from 'zss/feature/wanix/wanixwasmdriver'

describe('wanixspawndriver', () => {
  const wasibytes = new TextEncoder().encode('wasi_snapshot_preview1')
  const gojsbytes = new TextEncoder().encode('gojs')

  it('prefers driver hint over ramfs bytes', () => {
    expect(resolvedriverforwasm('#ramfs/a.wasm', 'gojs', wasibytes)).toBe(
      'gojs',
    )
  })

  it('reads driver from ramfs bytes when hint absent', () => {
    expect(resolvedriverforwasm('#ramfs/a.wasm', null, gojsbytes)).toBe('gojs')
  })

  it('throws when hint and ramfs bytes are both missing', () => {
    expect(() => resolvedriverforwasm('#ramfs/a.wasm', null, null)).toThrow(
      /missing ramfs bytes/,
    )
  })

  it('throws when wasm has no known import', () => {
    const unknown = new TextEncoder().encode('not-a-wasm-module')
    expect(() => readwanixwasmdriver(unknown)).toThrow(/driver unknown/)
    expect(() => resolvedriverforwasm('#ramfs/x.wasm', null, unknown)).toThrow(
      /driver unknown/,
    )
  })
})
