import { WANIX_ZEDCAFE_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'
import { deepcopy } from 'zss/mapping/types'

let zedcaferestart = 0
let zedcafeready = false
let zedcafetaskrid: string | null = null
/** Last successfully pushed export doc (path → parsed JSON). */
let lasthostpushdoc: Record<string, unknown> = {}
let pollactive = false
let guestdirty = false

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

export function readlasthostpushdoc(): Record<string, unknown> {
  return lasthostpushdoc
}

export function setlasthostpushdoc(doc: Record<string, unknown>) {
  lasthostpushdoc = deepcopy(doc)
}

export function clearlasthostpushdoc() {
  lasthostpushdoc = {}
}

export function readzedcafepollactive(): boolean {
  return pollactive
}

export function setzedcafepollactive(active: boolean) {
  pollactive = active
}

export function readzedcafeguestdirty(): boolean {
  return guestdirty
}

export function setzedcafeguestdirty(dirty: boolean) {
  guestdirty = dirty
}

export function resetwanixzedcafesessionfortest() {
  zedcaferestart = 0
  zedcafeready = false
  zedcafetaskrid = null
  lasthostpushdoc = {}
  pollactive = false
  guestdirty = false
}
