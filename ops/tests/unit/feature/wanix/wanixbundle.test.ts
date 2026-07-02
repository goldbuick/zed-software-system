import { listwanixwasmentries } from 'zss/feature/wanix/wanixbundle'

describe('wanixbundle', () => {
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
