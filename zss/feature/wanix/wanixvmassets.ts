/** Pinned wanix-extras CDN URLs for v86 VM boot (see submodules/wanix/README.md). */
const WANIX_EXTRAS_VERSION = '0.4.0-rc1'
const CDN_BASE = `https://cdn.jsdelivr.net/npm/wanix-extras@${WANIX_EXTRAS_VERSION}/dist`

export type WANIX_VM_ASSET_URLS = {
  linux: string
  v86: string
}

export function readwanixvmasseturls(): WANIX_VM_ASSET_URLS {
  return {
    linux: `${CDN_BASE}/wanix-linux.tgz`,
    v86: `${CDN_BASE}/v86.tgz`,
  }
}

export const DEFAULT_WANIX_VM_MEM = '512M'
export const DEFAULT_WANIX_VM_ID = 'linux-vm'
export const WANIX_VM_V86_DRIVER_PATH = '#vm/v86/v86-vm.wasm'
