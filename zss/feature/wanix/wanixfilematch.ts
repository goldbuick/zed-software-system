/** Worker-safe wanix drop filename / magic-byte checks (no iframe host imports). */

export function iswanixwasmfile(name: string, bytes: Uint8Array): boolean {
  if (/\.wasm$/i.test(name)) {
    return true
  }
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  )
}

export function iswanixbundlefile(name: string): boolean {
  return /\.tgz$/i.test(name) || /\.tar\.gz$/i.test(name)
}
