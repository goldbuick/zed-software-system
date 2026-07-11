/**
 * Types and state the register device / parent UI use to display wanix
 * and interact with wanix sessions (attach, tape, session MESSAGE).
 */

import { useTape } from 'zss/gadget/data/zustandstores'

import {
  registerwanixtermsessionopen,
  unregisterwanixtermsession,
} from './wanixtermbuffer'

// --- attach / active session ---

let attachedsessionkey: string | null = null
let activesessionkey: string | null = null
let userdetached = false
const attachlisteners = new Set<() => void>()

function bumpattach() {
  for (const listener of attachlisteners) {
    listener()
  }
}

function maybeattachactivesession() {
  if (activesessionkey == null || attachedsessionkey != null || userdetached) {
    return
  }
  attachedsessionkey = activesessionkey
  bumpattach()
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

/** Auto-attach when a new session opens and nothing is attached yet. */
export function onwanixtermsessionopen(sessionkey: string) {
  const key = sessionkey.trim()
  if (!key) {
    return
  }
  activesessionkey = key
  if (attachedsessionkey != null) {
    return
  }
  attachedsessionkey = key
  userdetached = false
  bumpattach()
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
  bumpattach()
}

export function detachwanixterm() {
  if (attachedsessionkey == null) {
    userdetached = true
    return
  }
  attachedsessionkey = null
  userdetached = true
  bumpattach()
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
  bumpattach()
}

export function subscribewanixattach(listener: () => void) {
  attachlisteners.add(listener)
  return () => {
    attachlisteners.delete(listener)
  }
}

/** Test hook */
export function resetwanixattachstatefortest() {
  attachedsessionkey = null
  activesessionkey = null
  userdetached = false
  attachlisteners.clear()
}

// --- tape visibility ---

export function readwanixtapevisible(): boolean {
  const { terminalmode, terminal, editor } = useTape.getState()
  return terminalmode === 'quick' || terminal.open || editor.open
}

export function revealwanixtapeifhidden(): boolean {
  if (readwanixtapevisible()) {
    return false
  }
  useTape.setState((state) => ({
    terminal: { ...state.terminal, open: true },
  }))
  return true
}

// --- session MESSAGE (iframe → register) ---

let onsessioncloseprune: ((sessionkey: string) => void) | null = null

export function registerwanixsessioncloseprune(
  fn: (sessionkey: string) => void,
): void {
  onsessioncloseprune = fn
}

export function applywanixsessionmessage(payload: {
  event?: unknown
  sessionkey?: unknown
}): void {
  if (typeof payload.sessionkey !== 'string') {
    return
  }
  const sessionkey = payload.sessionkey
  if (payload.event === 'open') {
    registerwanixtermsessionopen(sessionkey)
    if (readattachedsession() == null) {
      revealwanixtapeifhidden()
      onwanixtermsessionopen(sessionkey)
    } else {
      setwanixactivesession(sessionkey)
    }
    return
  }
  if (payload.event === 'active') {
    setwanixactivesession(sessionkey)
    return
  }
  if (payload.event === 'close') {
    if (sessionkey === readattachedsession()) {
      return
    }
    unregisterwanixtermsession(sessionkey)
    onsessioncloseprune?.(sessionkey)
  }
}

/** Display snapshot for one wanix term session. */
export type WanixSessionMeta = {
  sessionkey: string
  attached: boolean
  active: boolean
  cols: number
  rows: number
  scrollbackrows: number
  digest: string
  version: number
  altactive: boolean
  bracketedpaste: boolean
  label: string
}
