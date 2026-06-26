import { WANIX_ZED_CAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'

let zedcaferestart = 0
let zedcafeready = false

export function readwanixzedcaferestart(): number {
  return zedcaferestart
}

export function setwanixzedcaferestart(restart: number) {
  zedcaferestart = restart
}

export function readwanixzedcafeready(): boolean {
  return zedcafeready
}

export function setwanixzedcafeready(ready: boolean) {
  zedcafeready = ready
}

export function iswanixzedcafetask(taskid: string): boolean {
  return taskid === WANIX_ZED_CAFE_TASK_ID
}

/** Test hook — reset zed-cafe session flags. */
export function resetwanixzedcafesessionfortest() {
  zedcaferestart = 0
  zedcafeready = false
}
