import {
  WANIX_BOOT_REGRESSION_GATES,
  assesswanixbootregression,
  parsewanixperflines,
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
      '["books/demo-sid_x/objects/pid_1.json"]',
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
      '["books/demo-sid_x/objects/pid_1.json"]',
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
