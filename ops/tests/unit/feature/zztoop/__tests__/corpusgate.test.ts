import { readFileSync } from 'node:fs'

import { LANG_ZZTOOP_REPORT_PATH } from 'ops/lib/fixturepaths'

type FailureReport = {
  raw_oop: { total: number; ok: number; fail: number; ok_rate: number }
}

// CI floor for the committed corpus report. Raise this if a future run improves
// the rate; never lower it without a documented reason. Regenerate via:
//   yarn task run lang:zztoop:corpus:analyze raw-only full
const OK_RATE_FLOOR = 1.0

describe('zztoop committed corpus report', () => {
  const report = JSON.parse(
    readFileSync(LANG_ZZTOOP_REPORT_PATH, 'utf8'),
  ) as FailureReport

  it('meets the raw ok-rate floor', () => {
    expect(report.raw_oop.total).toBeGreaterThan(0)
    expect(report.raw_oop.ok_rate).toBeGreaterThanOrEqual(OK_RATE_FLOOR)
  })
})
