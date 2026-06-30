export const WANIX_ZED_CAFE_TASK_ID = 'zedcafe'
export const WANIX_ZED_CAFE_GUEST_MOUNT = 'zedcafe'
export const WANIX_ZED_CAFE_INBOX_RAMFS = '#ramfs/zedcafeinbox.json'
export const WANIX_ZED_CAFE_TASK_INBOX = 'zedcafeinbox.json'
export const WANIX_ZED_CAFE_WASM_RAMFS = '#ramfs/zedcafe.wasm'
export const WANIX_ZED_CAFE_TASK_WASM = 'zedcafe.wasm'
export const WANIX_ZED_CAFE_EXPORT_RAMFS = '#ramfs/zedcafe'
export const WANIX_ZED_CAFE_WASM_URL = '/wanix/zedcafe.wasm'
export const WANIX_ZED_CAFE_WASM_CMD = WANIX_ZED_CAFE_WASM_RAMFS
export const WANIX_ZED_CAFE_EXPORT_DEBOUNCE_MS = 2000
export const WANIX_ZED_CAFE_IMPORT_POLL_MS = 3000
/** Wall-clock cap for sim-worker export fetch during VM prep. */
export const WANIX_VM_ZED_CAFE_EXPORT_FETCH_MS = 10_000

export function readwanixzedcafetaskinboxpath(taskrid: string): string {
  return `#task/${taskrid}/${WANIX_ZED_CAFE_TASK_INBOX}`
}

export function readwanixzedcafetaskwasmpath(taskrid: string): string {
  return `#task/${taskrid}/${WANIX_ZED_CAFE_TASK_WASM}`
}

export function readwanixzedcafeexportsrc(taskrid: string): string {
  return `#task/${taskrid}/export`
}

export function readwanixzedcafeguestpath(relpath: string): string {
  return `${WANIX_ZED_CAFE_GUEST_MOUNT}/${relpath}`
}
