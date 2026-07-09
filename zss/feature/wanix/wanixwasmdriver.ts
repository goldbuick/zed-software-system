import type { WanixTaskDriver } from 'zss/feature/wanix/wanixelements.d.ts'

const WASI_IMPORT = new TextEncoder().encode('wasi_snapshot_preview1')
const GOJS_IMPORT = new TextEncoder().encode('gojs')

function bytescontain(haystack: Uint8Array, needle: Uint8Array): boolean {
  if (needle.length === 0 || haystack.length < needle.length) {
    return false
  }
  outer: for (let i = 0; i <= haystack.length - needle.length; ++i) {
    for (let j = 0; j < needle.length; ++j) {
      if (haystack[i + j] !== needle[j]) {
        continue outer
      }
    }
    return true
  }
  return false
}

/** Pick wanix task driver from wasm bytes (gojs vs wasip1). */
export function readwanixwasmdriver(bytes: Uint8Array): WanixTaskDriver {
  if (bytescontain(bytes, GOJS_IMPORT)) {
    return 'gojs'
  }
  if (bytescontain(bytes, WASI_IMPORT)) {
    return 'wasi'
  }
  throw new Error(
    'wanix wasm driver unknown: no gojs or wasi_snapshot_preview1 import',
  )
}
