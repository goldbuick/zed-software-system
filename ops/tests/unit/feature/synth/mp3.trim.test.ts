import {
  RECORD_EXPORT_TRIM_DB,
  trimaudiobufferdb,
} from 'zss/feature/synth/mp3'

describe('trimaudiobufferdb', () => {
  it('scales all channels by RECORD_EXPORT_TRIM_DB gain', () => {
    const left = new Float32Array([1, -1, 0.5])
    const right = new Float32Array([0.25, 0, -0.5])
    const buffer = {
      numberOfChannels: 2,
      getChannelData(channel: number) {
        return channel === 0 ? left : right
      },
    } as unknown as AudioBuffer

    trimaudiobufferdb(buffer, RECORD_EXPORT_TRIM_DB)

    const gain = Math.pow(10, RECORD_EXPORT_TRIM_DB / 20)
    expect(RECORD_EXPORT_TRIM_DB).toBe(-3)
    expect(left[0]).toBeCloseTo(gain, 5)
    expect(left[1]).toBeCloseTo(-gain, 5)
    expect(left[2]).toBeCloseTo(0.5 * gain, 5)
    expect(right[0]).toBeCloseTo(0.25 * gain, 5)
    expect(right[2]).toBeCloseTo(-0.5 * gain, 5)
  })
})
