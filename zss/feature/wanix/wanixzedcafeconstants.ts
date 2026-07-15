import { WANIX_ZEDCAFE_WASM_BUILD_ID } from 'zss/feature/wanix/wanixzedcafewasmversion'

export const WANIX_ZEDCAFE_TASK_ID = 'zedcafe'
/** Long-running remote↔zedcafe sync daemon (`#wanix zedsync`). */
export const WANIX_ZEDSYNC_TASK_ID = 'zedsync'
/** Attached-session drop mount: `input/<file>` (task `./input/…`, VM guest `/input/…`). */
export const WANIX_INPUT_MOUNT = 'input'
/** User-visible mount: `./zedcafe/` (task) or `/zedcafe/` (VM guest). */
export const WANIX_ZEDCAFE_GUEST_MOUNT = 'zedcafe'
export const WANIX_ZEDCAFE_WASM_RAMFS = '#ramfs/zedcafe.wasm'
/** Task-namespace wasm path (wanix-task child file bind only). */
export const WANIX_ZEDCAFE_TASK_WASM = 'zedcafe.wasm'
export const WANIX_ZEDCAFE_WASM_URL = '/wanix/zedcafe.wasm'
export const WANIX_ZEDCAFE_WASM_BUILD_STORAGE_KEY =
  'wanix-zedcafe-wasm-build-id'
export const WANIX_ZEDCAFE_WASM_CMD = WANIX_ZEDCAFE_TASK_WASM

export function readwanixzedcafewasmurl(): string {
  return `${WANIX_ZEDCAFE_WASM_URL}?v=${WANIX_ZEDCAFE_WASM_BUILD_ID}`
}

export const WANIX_VM_ZEDCAFE_EXPORT_FETCH_MS = 10_000
export const WANIX_VM_ZEDCAFE_IMPORT_MS = 10_000
export const WANIX_ZEDCAFE_EXPORT_WAIT_MS = 90_000
export const WANIX_ZEDCAFE_EXPORT_READY_POLL_MS = 250
/** Coalesce sim→zedcafe export checks (terrain mutations collapse within this window). */
export const WANIX_ZEDCAFE_EXPORT_COALESCE_MS = 500
/** Host + guest wait for content-ready stats.json. */
export const WANIX_ZEDCAFE_EXPORT_READY_TIMEOUT_MS = 600_000
/** Parent wait for `<target>/.zedsync-ready` after seeding a large remote tree. */
export const WANIX_ZEDSYNC_READY_TIMEOUT_MS = 900_000

export function readwanixzedcafeexportsrc(taskrid: string): string {
  return `#task/${taskrid}/export`
}

export function readwanixzedcafeguestpath(relpath: string): string {
  return `${WANIX_ZEDCAFE_GUEST_MOUNT}/${relpath}`
}
