/**
 * Parent UI display for wanix sessions (attach, tape, session MESSAGE).
 */

import {
  readattachedsession as readattachedsessionstate,
  readonsessioncloseprune,
  readuserdetached,
  readwanixactivesession as readwanixactivesessionstate,
  registerwanixsessioncloseprune as registersessioncloseprune,
  resetwanixattachforidle as resetattachforidle,
  resetwanixattachstatefortest as resetattachstatefortest,
  setattachedsessionkey,
  setuserdetached,
  setwanixactivesessionkey,
  subscribewanixattach as subscribeattach,
} from 'zss/device/wanixclient/state'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
import {
  registerwanixtermsessionopen,
  unregisterwanixtermsession,
} from 'zss/device/wanixclient/wanixtermbuffer'
import { useTape } from 'zss/gadget/data/zustandstores'

export function readwanixactivesession(): string | null {
  return readwanixactivesessionstate()
}

export function readattachedsession(): string | null {
  return readattachedsessionstate()
}

export function registerwanixsessioncloseprune(
  fn: (sessionkey: string) => void,
): void {
  registersessioncloseprune(fn)
}

function maybeattachactivesession() {
  const activesessionkey = readwanixactivesessionstate()
  if (
    activesessionkey == null ||
    readattachedsessionstate() != null ||
    readuserdetached()
  ) {
    return
  }
  setattachedsessionkey(activesessionkey)
}

export function setwanixactivesession(sessionkey: string | null) {
  const next = sessionkey?.trim() ? sessionkey.trim() : null
  if (readwanixactivesessionstate() === next) {
    maybeattachactivesession()
    return
  }
  setwanixactivesessionkey(next)
  maybeattachactivesession()
}

/** Auto-attach when a new session opens and nothing is attached yet. */
export function onwanixtermsessionopen(sessionkey: string) {
  const key = sessionkey.trim()
  if (!key) {
    return
  }
  if (readattachedsessionstate() != null) {
    setwanixactivesessionkey(key)
    return
  }
  useWanixClient.setState({
    activesessionkey: key,
    attachedsessionkey: key,
    userdetached: false,
  })
}

export function setattachedsession(sessionkey: string | null) {
  const next = sessionkey?.trim() ? sessionkey.trim() : null
  if (readattachedsessionstate() === next) {
    return
  }
  if (next != null) {
    useWanixClient.setState({
      attachedsessionkey: next,
      userdetached: false,
    })
    return
  }
  setattachedsessionkey(next)
}

export function detachwanixterm() {
  if (readattachedsessionstate() == null) {
    setuserdetached(true)
    return
  }
  useWanixClient.setState({
    attachedsessionkey: null,
    userdetached: true,
  })
}

export function cyclewanixattachedsession(
  orderedkeys: string[],
  direction: 1 | -1,
) {
  if (orderedkeys.length === 0) {
    return
  }
  const current = readattachedsessionstate()
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
  resetattachforidle()
}

export function subscribewanixattach(listener: () => void) {
  return subscribeattach(listener)
}

/** Test hook */
export function resetwanixattachstatefortest() {
  resetattachstatefortest()
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
    if (readattachedsessionstate() == null) {
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
    if (sessionkey === readattachedsessionstate()) {
      return
    }
    unregisterwanixtermsession(sessionkey)
    readonsessioncloseprune()?.(sessionkey)
  }
}
