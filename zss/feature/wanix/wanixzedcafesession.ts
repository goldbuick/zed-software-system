import { WANIX_ZED_CAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'

let zedcaferestart = 0
let zedcafeready = false
let zedcafetaskrid: string | null = null
let lasthostpushfingerprint = ''
let importsuppressexport = 0

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

export function readwanixzedcafetaskrid(): string | null {
  return zedcafetaskrid
}

export function setwanixzedcafetaskrid(taskrid: string | null) {
  zedcafetaskrid = taskrid
}

export function readlasthostpushfingerprint(): string {
  return lasthostpushfingerprint
}

export function setlasthostpushfingerprint(fingerprint: string) {
  lasthostpushfingerprint = fingerprint
}

export function readzedcafeimportsuppressingexport(): boolean {
  return importsuppressexport > 0
}

export function withzedcafeimportsuppress<T>(fn: () => T): T {
  ++importsuppressexport
  try {
    return fn()
  } finally {
    --importsuppressexport
  }
}

/** Test hook — reset zed-cafe session flags. */
export function resetwanixzedcafesessionfortest() {
  zedcaferestart = 0
  zedcafeready = false
  zedcafetaskrid = null
  lasthostpushfingerprint = ''
  importsuppressexport = 0
}
