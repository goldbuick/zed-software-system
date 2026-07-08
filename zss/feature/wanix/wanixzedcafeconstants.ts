export const WANIX_ZEDCAFE_TASK_ID = 'zedcafe'
export const WANIX_ZEDCAFE_GUEST_MOUNT = 'zedcafe'
export const WANIX_ZEDCAFE_INBOX_RAMFS = '#ramfs/zedcafeinbox.json'
export const WANIX_ZEDCAFE_TASK_INBOX = 'zedcafeinbox.json'
export const WANIX_ZEDCAFE_WASM_RAMFS = '#ramfs/zedcafe.wasm'
export const WANIX_ZEDCAFE_TASK_WASM = 'zedcafe.wasm'
export const WANIX_ZEDCAFE_EXPORT_RAMFS = '#ramfs/zedcafe'
export const WANIX_ZEDCAFE_WASM_URL = '/wanix/zedcafe.wasm'
export const WANIX_ZEDCAFE_WASM_CMD = WANIX_ZEDCAFE_WASM_RAMFS
export const WANIX_ZEDCAFE_EXPORT_DEBOUNCE_MS = 2000
export const WANIX_ZEDCAFE_IMPORT_POLL_MS = 3000
export const WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS = 10_000
export const WANIX_ZEDCAFE_EXPORT_WAIT_MS = 90_000
export const WANIX_ZEDCAFE_EXPORT_READY_POLL_MS = 250
export const WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS = 30_000

export function readwanixzedcafetaskinboxpath(taskrid: string): string {
  return `#task/${taskrid}/${WANIX_ZEDCAFE_TASK_INBOX}`
}

export function readwanixzedcafetaskwasmpath(taskrid: string): string {
  return `#task/${taskrid}/${WANIX_ZEDCAFE_TASK_WASM}`
}

export function readwanixzedcafeexportsrc(taskrid: string): string {
  return `#task/${taskrid}/export`
}

export function readwanixzedcafeguestpath(relpath: string): string {
  return `${WANIX_ZEDCAFE_GUEST_MOUNT}/${relpath}`
}
