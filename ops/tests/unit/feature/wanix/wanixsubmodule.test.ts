import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  haswanixzedcafedirtyforward,
  WANIX_ZEDCAFE_DIRTY_FORWARD_MARKER,
} from 'ops/lib/wanix/wanixsubmodule'

describe('wanixsubmodule', () => {
  it('returns false when worker.go lacks the dirty-forward marker', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wanix-worker-'))
    const workergo = path.join(dir, 'worker.go')
    writeFileSync(workergo, 'package worker\n')
    expect(haswanixzedcafedirtyforward(workergo)).toBe(false)
  })

  it('returns true when worker.go contains the dirty-forward marker', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wanix-worker-'))
    const workergo = path.join(dir, 'worker.go')
    writeFileSync(
      workergo,
      `package worker\nconst x = "${WANIX_ZEDCAFE_DIRTY_FORWARD_MARKER}"\n`,
    )
    expect(haswanixzedcafedirtyforward(workergo)).toBe(true)
  })
})
