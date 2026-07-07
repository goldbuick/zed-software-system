import {
  readwanixtermbufferkeys,
} from 'zss/feature/wanix/wanixtermbuffer'

let attachedsessionkey: string | null = null
const listeners = new Set<() => void>()

function bump() {
  for (const listener of listeners) {
    listener()
  }
}

function maybeautoattach() {
  if (attachedsessionkey != null) {
    return
  }
  const keys = readwanixtermbufferkeys()
  if (keys.length > 0) {
    attachedsessionkey = keys[0]
    bump()
  }
}

export function tryautoattachwanixterm() {
  maybeautoattach()
}

export function readattachedsession(): string | null {
  return attachedsessionkey
}

export function setattachedsession(sessionkey: string | null) {
  const next = sessionkey?.trim() ? sessionkey.trim() : null
  if (attachedsessionkey === next) {
    return
  }
  attachedsessionkey = next
  bump()
}

export function detachwanixterm() {
  setattachedsession(null)
}

export function subscribewanixattach(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test hook */
export function resetwanixattachstatefortest() {
  attachedsessionkey = null
  listeners.clear()
}
