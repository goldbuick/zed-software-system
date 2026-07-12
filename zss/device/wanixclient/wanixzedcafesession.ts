import { deepcopy } from 'zss/mapping/types'

/** Last successfully pushed export doc (path → parsed JSON). */
let lasthostpushdoc: Record<string, unknown> = {}
let pollactive = false
let guestdirty = false

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
  lasthostpushdoc = {}
  pollactive = false
  guestdirty = false
}
