import {
  readwanixruntimeurls,
  readwanixvmasseturls,
  WANIX_NPM_VERSION,
  WANIX_VM_V86_DRIVER_PATH,
} from 'zss/feature/wanix/wanixvmassets'

describe('wanixvmassets', () => {
  it('returns pinned wanix npm CDN urls', () => {
    const urls = readwanixruntimeurls()
    expect(urls.version).toBe(WANIX_NPM_VERSION)
    expect(urls.js).toContain(`wanix@${WANIX_NPM_VERSION}`)
    expect(urls.js).toContain('wanix.min.js')
    expect(urls.debugWasm).toContain('wanix.debug.wasm')
  })

  it('returns pinned wanix-extras CDN urls', () => {
    const urls = readwanixvmasseturls()
    expect(urls.linux).toContain('wanix-extras@0.4.0-rc1')
    expect(urls.linux).toContain('wanix-linux.tgz')
    expect(urls.v86).toContain('wanix-extras@0.4.0-rc1')
    expect(urls.v86).toContain('v86.tgz')
  })

  it('documents v86 driver path required after vm-prep', () => {
    expect(WANIX_VM_V86_DRIVER_PATH).toBe('#vm/v86/v86-vm.wasm')
  })
})
