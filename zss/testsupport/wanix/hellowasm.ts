/** Smoke WASI binary from ops/fixtures/wanix/hello.wat (regenerate with wat2wasm). */
const HELLO_WASM_HEX =
  '0061736d01000000010c0260047f7f7f7f017f60000002230116776173695f736e617073686f745f70726576696577310866645f77726974650000030201010503010001071302066d656d6f72790200065f737461727400010a1d011b004100410836020041044112360200410141004101411410001a0b0b18010041080b1248656c6c6f2066726f6d2077616e6978210a'

function hextobytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export const HELLO_WASM_BYTES = hextobytes(HELLO_WASM_HEX)

/** Plain number array for Playwright page.evaluate (structured clone). */
export const HELLO_WASM_BYTE_LIST = [...HELLO_WASM_BYTES]

export function createhellowasmfile(): File {
  return new File([new Uint8Array(HELLO_WASM_BYTES)], 'hello.wasm', {
    type: 'application/wasm',
  })
}
