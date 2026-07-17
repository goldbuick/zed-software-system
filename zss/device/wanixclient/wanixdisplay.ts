/**
 * Parent UI display for wanix sessions (attach panel, session MESSAGE).
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
  setwanixactivesessionkey,
  subscribewanixattach as subscribeattach,
} from 'zss/device/wanixclient/state'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
import {
  registerwanixtermsessionopen,
  unregisterwanixtermsession,
} from 'zss/device/wanixclient/wanixtermbuffer'
import { iswanixdaemontaskid } from 'zss/device/wanixserver/taskidlepolicy'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'

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
  // Soft auto-attach: bind session for drops, open panel only if tape is already closed.
  // Never yank the tape CLI closed behind the user's back.
  const tapevisible = readwanixtapevisible()
  useWanixClient.setState({
    attachedsessionkey: activesessionkey,
    userdetached: false,
    ...(tapevisible ? {} : { attachpanelopen: true }),
  })
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
  // After manual detach, re-attach is always explicit (#wanix attach / menu).
  if (readuserdetached()) {
    setwanixactivesessionkey(key)
    return
  }
  // Soft auto-attach: do not close an open tape CLI. Open the attach panel only
  // when the tape is already hidden so we never leave a blank dither trap.
  const tapevisible = readwanixtapevisible()
  useWanixClient.setState({
    activesessionkey: key,
    attachedsessionkey: key,
    userdetached: false,
    ...(tapevisible ? {} : { attachpanelopen: true }),
  })
}

/** Hide tape CLI chrome so attach panel can take the slot (does not close editor). */
function closetapeterminalforattach() {
  const { terminalmode, terminal } = useTape.getState()
  if (terminalmode === 'quick') {
    useTape.setState({ terminalmode: 'cli' })
  }
  if (terminal.open) {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: false },
    }))
  }
}

export function setattachedsession(sessionkey: string | null) {
  const next = sessionkey?.trim() ? sessionkey.trim() : null
  if (readattachedsessionstate() === next) {
    if (next != null) {
      closetapeterminalforattach()
      useWanixClient.setState({ attachpanelopen: true })
    }
    return
  }
  if (next != null) {
    closetapeterminalforattach()
    useWanixClient.setState({
      attachedsessionkey: next,
      userdetached: false,
      attachpanelopen: true,
    })
    return
  }
  setattachedsessionkey(next)
}

export function openwanixattachpanel() {
  closetapeterminalforattach()
  useWanixClient.setState({ attachpanelopen: true })
}

export function closewanixattachpanel() {
  useWanixClient.setState({ attachpanelopen: false })
}

export function readwanixattachpanelopen(): boolean {
  return useWanixClient.getState().attachpanelopen
}

export function readwanixattachlayout(): TAPE_DISPLAY {
  return useWanixClient.getState().attachlayout
}

/** Cycle attach panel TOP/FULL/BOTTOM; does not touch useTape.layout. */
export function cyclewanixattachlayout(inc: boolean) {
  const { attachlayout } = useWanixClient.getState()
  const step = inc ? 1 : -1
  let nextlayout = (attachlayout as number) + step
  if (nextlayout < 0) {
    nextlayout += TAPE_DISPLAY.MAX
  }
  if (nextlayout >= (TAPE_DISPLAY.MAX as number)) {
    nextlayout -= TAPE_DISPLAY.MAX
  }
  useWanixClient.setState({ attachlayout: nextlayout })
}

export function detachwanixterm() {
  if (readattachedsessionstate() == null) {
    useWanixClient.setState({
      userdetached: true,
      attachpanelopen: false,
    })
    return
  }
  useWanixClient.setState({
    attachedsessionkey: null,
    userdetached: true,
    attachpanelopen: false,
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

// --- tape visibility (CLI tape; independent of attach panel) ---

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
    // One-shot tasks: keep buffer only while attached (read after exit).
    // Daemons (zedsync/zedcafe): term EOF is not process death — keep keys so
    // `#wanix attach` still works after detach + quiet/EOF close.
    if (
      !iswanixdaemontaskid(sessionkey) &&
      sessionkey !== readattachedsessionstate()
    ) {
      unregisterwanixtermsession(sessionkey)
    }
    readonsessioncloseprune()?.(sessionkey)
  }
}
