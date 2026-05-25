function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

/** Matches Tone `drumvolume = new Volume(volumetodb(100) + 10)`. */
export const WASM_DRUM_BUS_DB = volumetodb(100) + 10
export const WASM_DRUM_BUS_GAIN = Math.pow(10, WASM_DRUM_BUS_DB / 20)
