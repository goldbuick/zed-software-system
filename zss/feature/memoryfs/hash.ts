/** Fast content stamp for poll / loop-guard (not cryptographic). */
export function memoryfshashbytes(bytes: Uint8Array): string {
  let h = 2166136261
  for (let i = 0; i < bytes.length; ++i) {
    h ^= bytes[i]
    h = Math.imul(h, 16777619)
  }
  return `${(h >>> 0).toString(16)}:${bytes.length}`
}
