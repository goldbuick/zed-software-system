import {
  WANIX_AGENT_LATENCY_SLOS,
  WANIX_AGENT_WORKLOAD_PROFILES,
  WANIX_BOOT_REGRESSION_GATES,
  assessagentlatencyslos,
  assesswanixbootregression,
  parsewanixperflines,
  percentilems,
} from 'zss/feature/wanix/wanixbootregression'

describe('wanix boot regression gates', () => {
  it('defines vm, cold task, and warm task gates', () => {
    const paths = WANIX_BOOT_REGRESSION_GATES.map((gate) => gate.path)
    expect(paths).toEqual(['vm', 'coldtask', 'warmtask'])
  })

  it('passes vm gate when iframe sync and export marks are present', () => {
    const logs = [
      '~ # zedcafe-books',
      '  name: coolregionsbow',
    ]
    const perf = [
      '[wanix-perf] synczedcafeexport-end {"bookcount":1,"sinceanchor":4200}',
    ]
    const result = assesswanixbootregression('vm', logs, perf)
    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('passes cold task gate when daemon synced and findplayers json appears', () => {
    const logs = [
      '[zedcafe-export] daemon start memcount=1',
      '["demo-sid_x/objects/pid_1.json"]',
    ]
    const perf = [
      '[wanix-perf] activate-export-end {"memcount":1,"sinceanchor":9000}',
      '[wanix-perf] spawntask-return {"taskid":"findplayers-1"}',
    ]
    const result = assesswanixbootregression('coldtask', logs, perf)
    expect(result.ok).toBe(true)
  })

  it('fails cold task gate when export-ready exceeds budget', () => {
    const logs = [
      '[zedcafe-export] daemon start memcount=1',
      '["demo-sid_x/objects/pid_1.json"]',
    ]
    const perf = [
      '[wanix-perf] activate-export-end {"memcount":1,"sinceanchor":25000}',
      '[wanix-perf] spawntask-return {"taskid":"findplayers-1"}',
    ]
    const result = assesswanixbootregression('coldtask', logs, perf)
    expect(result.ok).toBe(false)
    expect(result.missing.some((item) => item.includes('activate-export-end'))).toBe(
      true,
    )
  })

  it('parses perf lines with sinceanchor and elapsedms', () => {
    const entries = parsewanixperflines([
      '[wanix-perf] sim-export-fetch-end {"memcount":1,"elapsedms":42,"sinceanchor":100}',
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0].label).toBe('sim-export-fetch-end')
    expect(entries[0].sinceanchor).toBe(100)
    expect(entries[0].elapsedms).toBe(42)
  })
})

describe('wanix agent latency slos', () => {
  it('defines singlefile, batchobjects, and structuraldelete workload profiles', () => {
    expect(WANIX_AGENT_WORKLOAD_PROFILES).toEqual([
      'singlefile',
      'batchobjects',
      'structuraldelete',
    ])
  })

  it('defines sub-200ms sim<->guest and sim<->peer budgets, sub-400ms peer-to-sim', () => {
    expect(WANIX_AGENT_LATENCY_SLOS).toEqual({
      'sim-to-guest': 200,
      'guest-to-sim': 200,
      'sim-to-peer': 200,
      'peer-to-sim': 400,
    })
  })

  it('percentilems returns 0 for an empty sample set', () => {
    expect(percentilems([], 95)).toBe(0)
  })

  it('percentilems computes nearest-rank p50 and p95', () => {
    const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect(percentilems(samples, 50)).toBe(50)
    expect(percentilems(samples, 95)).toBe(100)
    expect(percentilems(samples, 0)).toBe(10)
  })

  it('percentilems does not mutate the input array', () => {
    const samples = [50, 10, 30]
    percentilems(samples, 50)
    expect(samples).toEqual([50, 10, 30])
  })

  it('assessagentlatencyslos passes when all paths are within budget', () => {
    const result = assessagentlatencyslos({
      'sim-to-guest': [50, 60, 70, 80, 90],
      'guest-to-sim': [40, 50, 60, 70, 80],
      'sim-to-peer': [60, 70, 80, 90, 100],
      'peer-to-sim': [100, 150, 200, 250, 300],
    })
    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
    expect(result.report['sim-to-guest']).toEqual({
      p50: 70,
      p95: 90,
      budget: 200,
    })
    expect(result.report['peer-to-sim'].budget).toBe(400)
  })

  it('assessagentlatencyslos reports missing paths with no samples', () => {
    const result = assessagentlatencyslos({
      'sim-to-guest': [50, 60],
    })
    expect(result.ok).toBe(false)
    expect(result.missing).toContain('guest-to-sim: no samples')
    expect(result.missing).toContain('sim-to-peer: no samples')
    expect(result.missing).toContain('peer-to-sim: no samples')
    expect(result.report['guest-to-sim']).toBeUndefined()
  })

  it('assessagentlatencyslos fails a path whose p95 exceeds budget', () => {
    const result = assessagentlatencyslos({
      'sim-to-guest': [50, 60, 500],
      'guest-to-sim': [40, 50, 60],
      'sim-to-peer': [40, 50, 60],
      'peer-to-sim': [100, 150, 200],
    })
    expect(result.ok).toBe(false)
    expect(
      result.missing.some(
        (item) => item.includes('sim-to-guest') && item.includes('exceeded'),
      ),
    ).toBe(true)
  })
})
