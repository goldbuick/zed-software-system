/** SHA-256 for airshare integrity (browser SubtleCrypto or Node crypto). */

export async function sha256bytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const copy = new Uint8Array(data.byteLength)
    copy.set(data)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', copy)
    return new Uint8Array(digest)
  }
  const { createHash } = await import('node:crypto')
  return new Uint8Array(createHash('sha256').update(data).digest())
}

export function sha256equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; ++i) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}
