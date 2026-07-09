import { WANIX_ZEDCAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'

let zedcaferestart = 0
let zedcafeready = false
let zedcafetaskrid: string | null = null
let lasthostpushfingerprint = ''
let pollactive = false

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
  return taskid === WANIX_ZEDCAFE_TASK_ID
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

export function readzedcafepollactive(): boolean {
  return pollactive
}

export function setzedcafepollactive(active: boolean) {
  pollactive = active
}

export function resetwanixzedcafesessionfortest() {
  zedcaferestart = 0
  zedcafeready = false
  zedcafetaskrid = null
  lasthostpushfingerprint = ''
  pollactive = false
}
