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

/** Attrs on `<wanix-system>` required for VM/gojs (vm-simple.html recipe). */
export function applywanixsystemkernelattrs(system: HTMLElement): void {
  system.setAttribute('wasm', readwanixkernelwasmurl())
  system.setAttribute('allow-origins', '*')
  system.setAttribute('debug', '')
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

function escapehtmlattr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

/** Declarative VM prep markup — matches vm-simple.html / bootwanixsystemforvm. */
export function buildwanixvmprehtml(
  urls: WANIX_VM_ASSET_URLS,
  systemid = 'zss-wanix-iframe-sys',
): string {
  const wasm = escapehtmlattr(readwanixkernelwasmurl())
  const linux = escapehtmlattr(urls.linux)
  const v86 = escapehtmlattr(urls.v86)
  const id = escapehtmlattr(systemid)
  return `<wanix-system wasm="${wasm}" allow-origins="*" debug id="${id}">
<wanix-bind dst="." src="${linux}" type="archive"></wanix-bind>
<wanix-bind dst="vm" src="#vm"></wanix-bind>
<wanix-bind dst="#vm/v86" src="${v86}" type="archive"></wanix-bind>
</wanix-system>`
}

/** Declarative WASI task prep — ramfs boot bind before first ready. */
export function buildwanixtaskprehtml(
  systemid = 'zss-wanix-iframe-sys',
): string {
  const wasm = escapehtmlattr(readwanixkernelwasmurl())
  const id = escapehtmlattr(systemid)
  return `<wanix-system wasm="${wasm}" allow-origins="*" debug id="${id}">
<wanix-bind dst="." src="#ramfs"></wanix-bind>
</wanix-system>`
}

/** Declarative VM spawn — vm-simple recipe with id/mem. */
export function buildwanixvmspawnhtml(vmid: string, mem: string): string {
  const id = escapehtmlattr(vmid)
  const memattr = escapehtmlattr(mem)
  return `<wanix-vm id="${id}" export="ttyS0" term mem="${memattr}" start></wanix-vm>
<wanix-term path="#vm/1/term" raw data-zss-vm-term="${id}"></wanix-term>`
}

/**
 * Full declarative VM system — binds + vm + term as initial children, matching
 * the working vm-simple recipe. `<wanix-system>` only launches `<wanix-vm>`
 * children present at boot, so the vm MUST be in the initial markup (a vm added
 * after `ready` registers but never starts).
 */
export function buildwanixvmfullhtml(
  urls: WANIX_VM_ASSET_URLS,
  vmid: string,
  mem: string,
  systemid = 'zss-wanix-iframe-sys',
): string {
  const wasm = escapehtmlattr(readwanixkernelwasmurl())
  const linux = escapehtmlattr(urls.linux)
  const v86 = escapehtmlattr(urls.v86)
  const id = escapehtmlattr(systemid)
  const memattr = escapehtmlattr(mem)
  const vmidattr = escapehtmlattr(vmid)
  return `<wanix-system wasm="${wasm}" allow-origins="*" debug id="${id}">
<wanix-bind dst="." src="${linux}" type="archive"></wanix-bind>
<wanix-bind dst="vm" src="#vm"></wanix-bind>
<wanix-bind dst="#vm/v86" src="${v86}" type="archive"></wanix-bind>
<wanix-vm export="ttyS0" term mem="${memattr}" start></wanix-vm>
<wanix-term path="#vm/1/term" raw data-zss-vm-term="${vmidattr}"></wanix-term>
</wanix-system>`
}
