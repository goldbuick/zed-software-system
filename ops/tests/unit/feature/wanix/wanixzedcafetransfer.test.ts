import {
  WANIX_ZEDCAFE_TRANSFER_THRESHOLD_BYTES,
  exportfilestotransferable,
  readzedcafefilesbytesize,
} from 'zss/feature/wanix/wanixzedcafetransfer'
import type { WanixZedCafeGuestFile } from 'zss/feature/wanix/wanixzedcafetypes'

function makefile(path: string, bytelength: number): WanixZedCafeGuestFile {
  return { path, data: new Uint8Array(bytelength) }
}

describe('wanixzedcafetransfer', () => {
  it('sums byte size across files', () => {
    const files = [makefile('a.json', 10), makefile('b.json', 20)]
    expect(readzedcafefilesbytesize(files)).toBe(30)
  })

  it('returns null below the transfer threshold', () => {
    const files = [makefile('a.json', 128)]
    expect(exportfilestotransferable(files)).toBeNull()
  })

  it('collects unique ArrayBuffers above the transfer threshold', () => {
    const big = makefile('big.json', WANIX_ZEDCAFE_TRANSFER_THRESHOLD_BYTES + 1)
    const files = [big, makefile('small.json', 4)]
    const payload = exportfilestotransferable(files)
    expect(payload).not.toBeNull()
    expect(payload?.files).toBe(files)
    expect(payload?.transferable).toEqual([big.data.buffer, files[1].data.buffer])
  })
})
