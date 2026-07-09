export const WANIX_ZEDCAFE_TASK_ID = 'zedcafe'
/** User-visible mount: `./zedcafe/` (task) or `/zedcafe/` (VM guest). */
export const WANIX_ZEDCAFE_GUEST_MOUNT = 'zedcafe'
export const WANIX_ZEDCAFE_WASM_RAMFS = '#ramfs/zedcafe.wasm'
/** Task-namespace wasm path (wanix-task child file bind only). */
export const WANIX_ZEDCAFE_TASK_WASM = 'zedcafe.wasm'
/** Internal export staging tree under `#ramfs` — not exposed at guest `/`. */
export const WANIX_ZEDCAFE_EXPORT_RAMFS = '#ramfs/zedcafe'
export const WANIX_ZEDCAFE_WASM_URL = '/wanix/zedcafe.wasm'
export const WANIX_ZEDCAFE_WASM_CMD = WANIX_ZEDCAFE_TASK_WASM
export const WANIX_ZEDCAFE_EXPORT_DEBOUNCE_MS = 2000
export const WANIX_ZEDCAFE_IMPORT_POLL_MS = 3000
export const WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS = 10_000
export const WANIX_ZEDCAFE_EXPORT_WAIT_MS = 90_000
export const WANIX_ZEDCAFE_EXPORT_READY_POLL_MS = 250
export const WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS = 30_000

export function readwanixzedcafetaskwasmpath(taskrid: string): string {
  return `#task/${taskrid}/${WANIX_ZEDCAFE_TASK_WASM}`
}

export function readwanixzedcafeexportsrc(taskrid: string): string {
  return `#task/${taskrid}/export`
}

export function readwanixzedcafeguestpath(relpath: string): string {
  return `${WANIX_ZEDCAFE_GUEST_MOUNT}/${relpath}`
}
