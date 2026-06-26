export const WANIX_ZED_CAFE_TASK_ID = 'zed-cafe'
export const WANIX_ZED_CAFE_INBOX_RAMFS = '#ramfs/zed-cafe-inbox.json'
export const WANIX_ZED_CAFE_TASK_INBOX = 'zed-cafe-inbox.json'
export const WANIX_ZED_CAFE_WASM_RAMFS = '#ramfs/zed-cafe.wasm'
export const WANIX_ZED_CAFE_TASK_WASM = 'zed-cafe.wasm'
export const WANIX_ZED_CAFE_EXPORT_RAMFS = '#ramfs/zed-cafe'
export const WANIX_ZED_CAFE_WASM_URL = '/wanix/zed-cafe.wasm'
export const WANIX_ZED_CAFE_WASM_CMD = WANIX_ZED_CAFE_WASM_RAMFS
export const WANIX_ZED_CAFE_EXPORT_DEBOUNCE_MS = 2000

export function readwanixzedcafetaskinboxpath(taskrid: string): string {
  return `#task/${taskrid}/${WANIX_ZED_CAFE_TASK_INBOX}`
}

export function readwanixzedcafetaskwasmpath(taskrid: string): string {
  return `#task/${taskrid}/${WANIX_ZED_CAFE_TASK_WASM}`
}

export function readwanixzedcafeexportsrc(taskrid: string): string {
  return `#task/${taskrid}/export`
}
