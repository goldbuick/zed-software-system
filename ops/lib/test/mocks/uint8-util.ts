/** Jest mock for uint8-util — decodes hex so CHARSET/PALETTE fixtures load correctly. */
export function hex2arr(hex: string): Uint8Array {
  const len = hex.length / 2
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function arr2hex(arr: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i].toString(16).padStart(2, '0')
  }
  return hex
}
