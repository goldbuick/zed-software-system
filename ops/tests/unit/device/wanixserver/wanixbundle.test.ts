import { listwanixwasmentries, readbundleflatpath } from 'zss/device/wanixserver/wanixbundle'

describe('wanixbundle', () => {
  describe('readbundleflatpath', () => {
    it('flattens single wasm under bundle prefix', () => {
      expect(readbundleflatpath('bundle-a', 'bundle-a/hello.wasm')).toBe(
        'bundle-a-hello.wasm',
      )
    })

    it('flattens nested wasm paths', () => {
      expect(readbundleflatpath('bundle-a', 'bundle-a/sub/b.wasm')).toBe(
        'bundle-a-sub-b.wasm',
      )
    })
  })

  describe('listwanixwasmentries', () => {
    it('lists wasm paths under bundle prefix', () => {
      const files = [
        { path: 'bundle-a/a.wasm', bytes: new Uint8Array([1]) },
        { path: 'bundle-a/readme.txt', bytes: new Uint8Array([2]) },
        { path: 'bundle-a/sub/b.wasm', bytes: new Uint8Array([3]) },
      ]
      expect(listwanixwasmentries(files, 'bundle-a')).toEqual([
        'bundle-a/a.wasm',
        'bundle-a/sub/b.wasm',
      ])
    })
  })
})
