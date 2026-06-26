/** Pinned wanix npm + extras CDN URLs (see ops/fixtures/harness/wanix/vm-simple.html). */
export const WANIX_NPM_VERSION = '0.4.0-alpha8'
const WANIX_EXTRAS_VERSION = '0.4.0-rc1'
const WANIX_CDN_BASE = `https://cdn.jsdelivr.net/npm/wanix@${WANIX_NPM_VERSION}/dist`
const EXTRAS_CDN_BASE = `https://cdn.jsdelivr.net/npm/wanix-extras@${WANIX_EXTRAS_VERSION}/dist`

export type WANIX_RUNTIME_URLS = {
  version: string
  js: string
  wasm: string
  debugWasm: string
}

export type WANIX_VM_ASSET_URLS = {
  linux: string
  v86: string
}

export function readwanixruntimeurls(): WANIX_RUNTIME_URLS {
  return {
    version: WANIX_NPM_VERSION,
    js: `${WANIX_CDN_BASE}/wanix.min.js`,
    wasm: `${WANIX_CDN_BASE}/wanix.wasm`,
    debugWasm: `${WANIX_CDN_BASE}/wanix.debug.wasm`,
  }
}

/** Kernel wasm for `<wanix-system>` — debug build matches working vm-simple harness. */
export function readwanixkernelwasmurl(): string {
  return readwanixruntimeurls().debugWasm
}

export function readwanixvmasseturls(): WANIX_VM_ASSET_URLS {
  return {
    linux: `${EXTRAS_CDN_BASE}/wanix-linux.tgz`,
    v86: `${EXTRAS_CDN_BASE}/v86.tgz`,
  }
}

export const DEFAULT_WANIX_VM_MEM = '512M'
export const DEFAULT_WANIX_VM_ID = 'linux-vm'
export const WANIX_VM_V86_DRIVER_PATH = '#vm/v86/v86-vm.wasm'
