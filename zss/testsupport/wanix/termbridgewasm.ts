/** WASI binary from ops/fixtures/wanix/termbridge.wat — term-out banner + hold for wanix-term bridge. */
const TERM_BRIDGE_WASM_HEX =
  '0061736d01000000010c0260047f7f7f7f017f60000002230116776173695f736e617073686f745f70726576696577310866645f77726974650000030201010503010001071302066d656d6f72790200065f737461727400010a220120004100410836020041044134360200410141004101411010001a03400c000b0b0b3a010041080b3477616e6978207465726d206272696467652072656164790a747970652070696e6720666f722062726964676520706f6e670a3e20'

function hextobytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export const TERM_BRIDGE_WASM_BYTES = hextobytes(TERM_BRIDGE_WASM_HEX)

export const TERM_BRIDGE_WASM_BYTE_LIST = [...TERM_BRIDGE_WASM_BYTES]

export function createtermbridgewasmfile(): File {
  return new File([new Uint8Array(TERM_BRIDGE_WASM_BYTES)], 'termbridge.wasm', {
    type: 'application/wasm',
  })
}
