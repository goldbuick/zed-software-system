import {
  computefxbusmetrics,
  estimatewetfrommix,
  isfxbussoloscenario,
} from '../fxbusmetrics'
import type { LEVEL_STABILITY_METRICS } from '../../wasm/levelstabilitymetrics'

function stubmetrics(overallrmsdb: number): LEVEL_STABILITY_METRICS {
  return {
    windows: 1,
    windowms: 46,
    activewindows: 1,
    silentwindows: 0,
    peakrangeDb: 0,
    rmsrangeDb: 0,
    peakstdDb: 0,
    rmsstdDb: 0,
    creststdDb: 0,
    overallpeakdb: overallrmsdb + 6,
    overallrmsdb,
    windowpeaksDb: [overallrmsdb + 6],
    windowrmsDb: [overallrmsdb],
    steadypeakrangeDb: 0,
    steadyrmsrangeDb: 0,
    steadypeakstdDb: 0,
    steadyrmsstdDb: 0,
    steadycwindows: 1,
  }
}

describe('fxbusmetrics', () => {
  it('estimates orthogonal wet RMS above dry', () => {
    const wet = estimatewetfrommix(-12, -18)
    expect(wet.estimatedwetrmsdb).toBeGreaterThan(-18)
    expect(wet.wetdryratioDb).toBeGreaterThan(-30)
  })

  it('computes lift vs dry baseline', () => {
    const row = computefxbusmetrics(
      'fxmatrix-echo',
      stubmetrics(-14),
      stubmetrics(-20),
    )
    expect(row.rmsliftvsdrydb).toBe(6)
    expect(row.scenarioId).toBe('fxmatrix-echo')
  })

  it('flags solo fxmatrix scenarios', () => {
    expect(isfxbussoloscenario('fxmatrix-echo')).toBe(true)
    expect(isfxbussoloscenario('fxmatrix-dry')).toBe(false)
    expect(isfxbussoloscenario('fxmatrix-heavy-six-low')).toBe(false)
  })
})
