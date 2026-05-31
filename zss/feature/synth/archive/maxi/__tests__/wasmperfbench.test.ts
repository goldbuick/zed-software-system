import { runwasmperfbench } from '../wasmperfbench'

const CAN_BENCH =
  typeof OfflineAudioContext !== 'undefined' &&
  typeof document !== 'undefined' &&
  process.env.ZSS_WASM_BENCH === '1'

;(CAN_BENCH ? describe : describe.skip)('wasmperfbench', () => {
  it('renders worst-case patch offline', async () => {
    const result = await runwasmperfbench(0.25)
    expect(result.rendersec).toBe(0.25)
    expect(result.wallsec).toBeGreaterThan(0)
    expect(result.realtimefactor).toBeGreaterThan(0)
  }, 120000)
})
