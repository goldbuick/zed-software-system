/** WASI binary from ops/fixtures/wanix/hold.wat — infinite loop for term-write e2e. */
const HOLD_WASM_HEX =
  '0061736d0100000001040160000003020100070a01065f737461727400000a0901070003400c000b0b'

function hextobytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export const HOLD_WASM_BYTES = hextobytes(HOLD_WASM_HEX)

export const HOLD_WASM_BYTE_LIST = [...HOLD_WASM_BYTES]

export function createholdwasmfile(): File {
  return new File([new Uint8Array(HOLD_WASM_BYTES)], 'hold.wasm', {
    type: 'application/wasm',
  })
}
