import { WASM_MASTER_PLAY_CODE } from '../wasmmasterplaycode'
import { wirewasmmasterchain } from '../wasmmasterchain'

describe('wasmmasterplaycode', () => {
  it('includes duck, compressor, razzle, and masterout', () => {
    expect(WASM_MASTER_PLAY_CODE).toContain('function masterout')
    expect(WASM_MASTER_PLAY_CODE).toContain('function startduck')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applycompressor')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applyrazzle')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_WET_MIX')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_HISS_GAIN')
    expect(WASM_MASTER_PLAY_CODE).toContain('function readmastervolume')
    expect(WASM_MASTER_PLAY_CODE).toContain('i === 3')
    expect(WASM_MASTER_PLAY_CODE).toContain('i === 9')
  })
})

describe('wasmmasterchain', () => {
  it('connects worklet directly to destination as mono', () => {
    const connects: Array<[unknown, number?, number?]> = []
    const destination = {
      channelInterpretation: '',
      channelCountMode: '',
    }
    const ctx = { destination }
    const worklet = {
      channelCount: 0,
      channelCountMode: '',
      channelInterpretation: '',
      disconnect: () => {},
      connect: (...args: [unknown, number?, number?]) => {
        connects.push(args)
      },
    }
    const chain = wirewasmmasterchain(ctx as any, worklet as any)
    expect(chain.wired).toBe(true)
    expect(worklet.channelCount).toBe(1)
    expect(connects).toEqual([[destination]])
  })
})
