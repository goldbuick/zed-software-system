import {
  buildwanixvmprehtml,
  buildwanixvmspawnhtml,
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

  it('buildwanixvmprehtml matches vm-simple bind layout', () => {
    const urls = readwanixvmasseturls()
    const html = buildwanixvmprehtml(urls)
    expect(html).toContain('wanix-system')
    expect(html).toContain('allow-origins="*"')
    expect(html).toContain(`src="${urls.linux}"`)
    expect(html).toContain('dst="vm" src="#vm"')
    expect(html).toContain(`src="${urls.v86}"`)
    expect(html).toContain('wanix.debug.wasm')
  })

  it('buildwanixvmspawnhtml matches vm-simple vm + term', () => {
    const html = buildwanixvmspawnhtml('linux-vm', '512M')
    expect(html).toContain('wanix-vm id="linux-vm"')
    expect(html).toContain('export="ttyS0" term')
    expect(html).toContain('mem="512M" start')
    expect(html).toContain('wanix-term path="#vm/1/term" raw data-zss-vm-term="linux-vm"')
  })
})
