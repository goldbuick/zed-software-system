import { createdevice, parsetarget } from 'zss/device'
import { hub } from 'zss/hub'

import { MESSAGE, ismessage } from './api'

/** Cap dedupe set so long sessions do not grow `syncids` without bound. */
const FORWARD_SYNCIDS_CAP = 4096

function peerblockedleaf(
  message: MESSAGE,
  mode: 'servertoclient' | 'clienttoserver',
): boolean {
  const r = parsetarget(message.target)
  if (r.target === 'netterminal' && r.path === 'cap') {
    return true
  }
  const leaf =
    r.path.length > 0 ? r.path.slice(r.path.lastIndexOf(':') + 1) : r.target
  if (leaf === 'ticktock') {
    return true
  }
  if (mode === 'servertoclient' && leaf === 'ready') {
    return true
  }
  if (mode === 'clienttoserver' && (leaf === 'second' || leaf === 'ready')) {
    return true
  }
  return false
}

export function createforward(
  handler: (message: MESSAGE) => void,
  options: { allowticktock?: boolean } = {},
) {
  const syncids = new Set<string>()
  const syncidorder: string[] = []

  function syncidsrecord(id: string): void {
    syncids.add(id)
    syncidorder.push(id)
    while (syncidorder.length > FORWARD_SYNCIDS_CAP) {
      const old = syncidorder.shift()
      if (old !== undefined) {
        syncids.delete(old)
      }
    }
  }

  // tick/tock are high-frequency clock pulses that we normally drop at the
  // bridge boundary so each worker hub doesn't have to dispatch them. The
  // boardrunner worker is an exception: Phase 2 of the boardrunner
  // authoritative-tick plan needs the server clock pulse to reach the worker
  // so it can run its own `memorytickmain`. Callers in that role pass
  // `allowticktock: true` to opt-in.
  const allowticktock = options.allowticktock === true

  function forward(message: any) {
    if (
      !ismessage(message) ||
      syncids.has(message.id) ||
      (!allowticktock && message.target === 'ticktock')
    ) {
      return
    }
    syncidsrecord(message.id)
    hub.invoke(message)
  }

  const device = createdevice('forward', ['all'], (message) => {
    if (!syncids.has(message.id)) {
      syncidsrecord(message.id)
      handler(message)
    }
  })

  function disconnect() {
    device.disconnect()
  }

  return { forward, disconnect }
}

// outbound message
export function shouldnotforwardonpeerserver(message: MESSAGE): boolean {
  return peerblockedleaf(message, 'servertoclient')
}

// create server -> client forward
export function shouldforwardservertoclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'log':
    case 'chat':
    case 'ready':
    case 'toast':
    case 'second':
    case 'ticktock':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'vm':
        case 'user':
        case 'heavy':
        case 'synth':
        case 'modem':
        case 'bridge':
        case 'register':
        case 'gadgetclient':
        case 'jsonsyncclient':
        case 'boardrunner':
          return true
      }
      switch (route.path) {
        case 'sync':
        case 'heavy':
        case 'joinack':
        case 'acklook':
        case 'acklogin':
        case 'ackoperator':
        case 'ackzsswords':
        case 'gadgetclient':
          return true
      }
      break
    }
  }
  return false
}

// outbound message
export function shouldnotforwardonpeerclient(message: MESSAGE): boolean {
  return peerblockedleaf(message, 'clienttoserver')
}

// create client -> server forward
export function shouldforwardclienttoserver(message: MESSAGE): boolean {
  const t = message.target
  if (t === 'ticktock') {
    return false
  }
  // Hot paths: avoid parsetarget alloc on common multiplayer messages.
  switch (t) {
    case 'user:input':
    case 'user:pilotstart':
    case 'user:pilotstop':
    case 'user:pilotclear':
    case 'jsonsyncserver:clientpatch':
    case 'jsonsyncserver:needsnapshot':
    case 'gadgetclient:paint':
    case 'gadgetclient:patch':
      return true
    default:
      break
  }
  if (t.startsWith('vm:')) {
    return true
  }
  if (t.startsWith('modem:')) {
    return true
  }
  const route = parsetarget(t)
  if (route.target === 'boardrunner') {
    return false
  }
  // gadgetclient traffic must reach the host so the operator's local
  // gadgetclient can render paints/patches emitted by a joiner's elected
  // boardrunner worker. Without this, whenever a peer wins the boardrunner
  // election for a board the operator is on, the host's UI freezes (it
  // would only ever receive paints from its own local boardrunner, which
  // is no longer authoritative for that board).
  switch (route.target) {
    case 'vm':
    case 'user':
    case 'modem':
    case 'jsonsyncserver':
    case 'gadgetclient':
      return true
  }
  switch (route.path) {
    case 'sync':
    case 'desync':
    case 'joinack':
    case 'needsnapshot':
    case 'ackboardrunner':
      return true
  }
  return false
}

// heavy worker messages

// create client -> heavy forward
export function shouldforwardclienttoheavy(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'heavy':
        case 'jsonsyncclient':
          return true
      }
      switch (route.path) {
        case 'acklook':
          return true
      }
      return false
    }
  }
}

// create heavy -> client forward
export function shouldforwardheavytoclient(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        case 'heavy':
        case 'jsonsyncserver':
          return true
      }
      switch (route.path) {
        case 'acklook':
          return true
      }
      return false
    }
  }
}

// boardrunner worker messages

// create client -> boardrunner forward
export function shouldforwardclienttoboardrunner(message: MESSAGE): boolean {
  switch (message.target) {
    // boardrunner workers are now authoritative for their elected boards
    // (Phase 2 of the boardrunner authoritative-tick plan), so the server's
    // clock pulse must reach them. ticktock is the per-frame heartbeat;
    // second is still the once-per-second housekeeping pulse.
    case 'ticktock':
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      switch (route.target) {
        // user:* carries player-originated events (input, pilot*) that the
        // boardrunner consumes to populate flags.inputqueue on its local
        // MEMORY. Server-side also sees user:input for login bootstrap +
        // lastinputtime tracking.
        case 'user':
        case 'jsonsyncclient':
        case 'boardrunner':
          return true
      }
      return false
    }
  }
}

// create boardrunner -> client forward (align with server→main minus clock)
export function shouldforwardboardrunnertoclient(message: MESSAGE): boolean {
  if (message.target === 'jsonsync:changed') {
    return false
  }
  const r = parsetarget(message.target)
  const leaf =
    r.path.length > 0 ? r.path.slice(r.path.lastIndexOf(':') + 1) : r.target
  if (leaf === 'ticktock' || leaf === 'second') {
    return false
  }
  return shouldforwardservertoclient(message)
}
