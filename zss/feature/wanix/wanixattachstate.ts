let attachedsessionkey: string | null = null
let activesessionkey: string | null = null
let userdetached = false
const listeners = new Set<() => void>()

function bump() {
  for (const listener of listeners) {
    listener()
  }
}

function maybeattachactivesession() {
  if (activesessionkey == null || attachedsessionkey != null || userdetached) {
    return
  }
  attachedsessionkey = activesessionkey
  bump()
}

export function readwanixactivesession(): string | null {
  return activesessionkey
}

export function setwanixactivesession(sessionkey: string | null) {
  const next = sessionkey?.trim() ? sessionkey.trim() : null
  if (activesessionkey === next) {
    maybeattachactivesession()
    return
  }
  activesessionkey = next
  maybeattachactivesession()
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
  if (next != null) {
    userdetached = false
  }
  bump()
}

export function detachwanixterm() {
  if (attachedsessionkey == null) {
    userdetached = true
    return
  }
  attachedsessionkey = null
  userdetached = true
  bump()
}

export function cyclewanixattachedsession(
  orderedkeys: string[],
  direction: 1 | -1,
) {
  if (orderedkeys.length === 0) {
    return
  }
  const current = attachedsessionkey
  const index = current != null ? orderedkeys.indexOf(current) : -1
  let nextindex = 0
  if (index >= 0) {
    nextindex = (index + direction + orderedkeys.length) % orderedkeys.length
  } else if (direction < 0) {
    nextindex = orderedkeys.length - 1
  }
  setattachedsession(orderedkeys[nextindex] ?? null)
}

/** Clears attach state when the wanix iframe goes idle (new room boot). */
export function resetwanixattachforidle() {
  attachedsessionkey = null
  activesessionkey = null
  userdetached = false
  bump()
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
  activesessionkey = null
  userdetached = false
  listeners.clear()
}
