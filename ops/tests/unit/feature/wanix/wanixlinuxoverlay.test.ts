import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { CAFE_PUBLIC_WANIX_DIR } from 'ops/lib/cafepublicpaths'

const OVERLAY = path.join(CAFE_PUBLIC_WANIX_DIR, 'zedcafe-linux-overlay.tgz')

describe('zedcafe linux overlay tarball', () => {
  it('contains zedcafe tools and boot rc when built', () => {
    if (!existsSync(OVERLAY)) {
      return
    }
    const listing = execFileSync('tar', ['-tzf', OVERLAY], {
      encoding: 'utf8',
    })
    expect(listing).toContain('boot/rc')
    expect(listing).toContain('usr/bin/zedcafe-stats')
    expect(listing).toContain('usr/bin/jq')
    expect(listing).toContain('usr/bin/curl')
    expect(listing).toContain('usr/bin/wget')
  })
})
