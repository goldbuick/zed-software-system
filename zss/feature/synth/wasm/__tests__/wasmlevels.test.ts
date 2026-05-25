import { WASM_DRUM_BUS_DB, WASM_DRUM_BUS_GAIN } from '../wasmlevels'

describe('wasmlevels', () => {
  it('matches Tone drumvolume bus gain', () => {
    expect(WASM_DRUM_BUS_DB).toBe(15)
    expect(WASM_DRUM_BUS_GAIN).toBeCloseTo(5.6234, 3)
  })
})
