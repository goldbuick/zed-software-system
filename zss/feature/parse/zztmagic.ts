const ZZT_WORLD_MAGIC = -1
const SZZT_WORLD_MAGIC = -2

/** True if bytes look like a ZZT world (signed int16 LE === -1 at offset 0). */
export function iszztworldbytes(content: Uint8Array): boolean {
  if (content.byteLength < 2) {
    return false
  }
  const view = new DataView(
    content.buffer,
    content.byteOffset,
    content.byteLength,
  )
  return view.getInt16(0, true) === ZZT_WORLD_MAGIC
}

/** True if bytes look like a Super ZZT world (signed int16 LE === -2). */
export function isszztworldbytes(content: Uint8Array): boolean {
  if (content.byteLength < 2) {
    return false
  }
  const view = new DataView(
    content.buffer,
    content.byteOffset,
    content.byteLength,
  )
  return view.getInt16(0, true) === SZZT_WORLD_MAGIC
}
