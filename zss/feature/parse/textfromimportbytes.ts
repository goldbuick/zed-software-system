const CHUNK = 0x8000

function doscodepoints(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK)
    out += String.fromCharCode(...slice)
  }
  return out
}

/**
 * Well-formed UTF-8 stays UTF-8. Anything else is DOS / CP437: each byte is
 * one charset index, same as ZZT readstring.
 */
export function textfromimportbytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return doscodepoints(bytes)
  }
}
