/** Jest mock for uint8-util to avoid loading in tests that don't need it */
export function hex2arr(_hex: string): Uint8Array {
  return new Uint8Array(256)
}

export function arr2hex(_arr: Uint8Array): string {
  return ''
}
