import { createmocksabengine } from 'zss/feature/synth/backend/wasm/testhelpers/mocksab'
import {
  WASM_VIBRATO_GROUP_COUNT,
  WASM_VIBRATO_SAB_LEN,
  WASM_VIBRATO_STRIDE,
} from 'zss/feature/synth/backend/wasm/wasmsabchannels'
import {
  defaultwasmvibratosab,
  pushwasmvibratogroup,
  wasmgroupvibratobase,
} from 'zss/feature/synth/backend/wasm/wasmvibratosab'

describe('wasmvibratosab', () => {
  it('uses epoch plus per-group stride layout', () => {
    const sab = defaultwasmvibratosab(100)
    expect(sab).toHaveLength(WASM_VIBRATO_SAB_LEN)
    expect(sab[0]).toBe(100)
    expect(WASM_VIBRATO_SAB_LEN).toBe(
      1 + WASM_VIBRATO_GROUP_COUNT * WASM_VIBRATO_STRIDE,
    )
    expect(wasmgroupvibratobase(1)).toBe(1 + WASM_VIBRATO_STRIDE)
  })

  it('pushes group schedule to vibrato sab', () => {
    const { engine } = createmocksabengine()
    const sab = defaultwasmvibratosab(0)
    pushwasmvibratogroup(engine, sab, 0, 1, 2, 0.5, 5)
    const base = wasmgroupvibratobase(0)
    expect(sab[base]).toBe(1)
    expect(sab[base + 1]).toBe(2)
    expect(sab[base + 2]).toBe(0.5)
    expect(sab[base + 3]).toBe(5)
  })
})
