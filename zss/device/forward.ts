/**
 * Message routing at worker and peer boundaries.
 *
 * - **`createforward`** ([`platform.ts`](../platform.ts), [`boardrunnerspace`](../boardrunnerspace.ts)): bridge between
 *   hubs — dedupes by `message.id` and can drop bare `ticktock` unless `allowticktock: true`.
 * - **`shouldforward*`** predicates: used by [`platform.ts`](../platform.ts) to decide which workers receive
 *   which messages (client → sim / heavy / boardrunner), and by [`netterminal.ts`](../feature/netterminal.ts)
 *   for PeerJS fan-out (combined with `shouldnotforwardonpeer*`).
 * - **Peer leaf guards** (`peerblockedjoinertohost` / `peerblockedhosttojoin`): extra filters on PeerJS so clock/handshake noise is not echoed
 *   the wrong way; nested targets use `targetlastleaf` (see [`forward.peer.test.ts`](__tests__/forward.peer.test.ts)).
 *
 * Inventory coverage: [`forward.inventory.test.ts`](__tests__/forward.inventory.test.ts) (targets drawn from
 * [`api.ts`](api.ts) `device.emit` families).
 */

import { createdevice, parsetarget } from 'zss/device'
import { hub } from 'zss/hub'

import { MESSAGE, ismessage } from './api'

/** Cap dedupe set so long sessions do not grow `syncids` without bound. */
const FORWARD_SYNCIDS_CAP = 4096

/** Bare `message.target` values allowed host → client (sim → main thread) and for peer host → join. */
const FORWARD_STC_EXACT = new Set<string>([
  'log',
  'chat',
  'ready',
  'toast',
  'second',
  'ticktock',
])

/** First segment (`foo` in `foo:…`) allowed for host → client after exact-match misses. */
const FORWARD_STC_ROUTE_TARGET = new Set<string>([
  'vm',
  'user',
  'heavy',
  'synth',
  'modem',
  'bridge',
  'register',
  'boardrunner',
  'gadgetclient',
  'rxreplclient',
])

/**
 * Path segment after first colon, when the **remainder** is one of these alone or matched as a label
 * (see `shouldforwardservertoclient` original behavior).
 */
const FORWARD_STC_ROUTE_PATH = new Set<string>([
  'sync',
  'heavy',
  'joinack',
  'acklook',
  'acklogin',
  'ackoperator',
  'ackzsswords',
  'gadgetclient',
])

const FORWARD_CTS_ROUTE_TARGET = new Set<string>([
  'vm',
  'user',
  'modem',
  'rxreplserver',
])
const FORWARD_CTS_ROUTE_PATH = new Set<string>([
  'sync',
  'joinack',
  'ackboardrunner',
])

const FORWARD_CTB_ROUTE_TARGET = new Set<string>([
  'user',
  'boardrunner',
  'rxreplclient',
])

/** Leaf names blocked for joiner → host (PeerJS); see `targetlastleaf`. */
const PEER_BLOCKED_LEAF_CLIENT_TO_SERVER = new Set<string>([
  'ticktock',
  'second',
  'ready',
])

/** Leaf names blocked for host → joiner (PeerJS). */
const PEER_BLOCKED_LEAF_SERVER_TO_CLIENT = new Set<string>(['ready'])

/** Last `:` segment of `target` for nested routes (e.g. `modem:second` → `second`). */
function targetlastleaf(target: string): string {
  const r = parsetarget(target)
  if (r.path.length > 0) {
    return r.path.slice(r.path.lastIndexOf(':') + 1)
  }
  return r.target
}

function peerblockednetterminalcap(target: string): boolean {
  const r = parsetarget(target)
  return r.target === 'netterminal' && r.path === 'cap'
}

/** Joiner → host (PeerJS): drop leaf noisy targets; `netterminal:cap` always dropped. */
function peerblockedjoinertohost(message: MESSAGE): boolean {
  if (peerblockednetterminalcap(message.target)) {
    return true
  }
  return PEER_BLOCKED_LEAF_CLIENT_TO_SERVER.has(targetlastleaf(message.target))
}

/** Host → joiner (PeerJS): drop selected leaves; `netterminal:cap` always dropped. */
function peerblockedhosttojoin(message: MESSAGE): boolean {
  if (peerblockednetterminalcap(message.target)) {
    return true
  }
  return PEER_BLOCKED_LEAF_SERVER_TO_CLIENT.has(targetlastleaf(message.target))
}

/** Shared by client↔heavy bridge; identical rules both directions. */
function heavyworkerbridgeallowed(target: string): boolean {
  switch (target) {
    case 'ticktock':
      return false
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(target)
      if (route.target === 'heavy') {
        return true
      }
      return route.path === 'acklook'
    }
  }
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

/** True = drop on PeerJS **host → joiner** (after `shouldforwardservertoclient`). */
export function shouldnotforwardonpeerserver(message: MESSAGE): boolean {
  return peerblockedhosttojoin(message)
}

/** True = allow host → client in main bridge and for PeerJS host → joiner. */
export function shouldforwardservertoclient(message: MESSAGE): boolean {
  const target = message.target
  if (FORWARD_STC_EXACT.has(target)) {
    return true
  }
  const route = parsetarget(target)
  if (FORWARD_STC_ROUTE_TARGET.has(route.target)) {
    return true
  }
  return FORWARD_STC_ROUTE_PATH.has(route.path)
}

/** True = drop on PeerJS **joiner → host** (after `shouldforwardclienttoserver`). */
export function shouldnotforwardonpeerclient(message: MESSAGE): boolean {
  return peerblockedjoinertohost(message)
}

/**
 * True = forward client → sim worker ([`platform.ts`](../platform.ts)). `boardrunner:*` is false so those
 * messages use `shouldforwardclienttoboardrunner` only.
 */
export function shouldforwardclienttoserver(message: MESSAGE): boolean {
  const t = message.target
  switch (t) {
    case 'user:input':
    case 'user:pilotstart':
    case 'user:pilotstop':
    case 'user:pilotclear':
    case 'rxreplserver:push_batch':
    case 'rxreplserver:pull_request':
      return true
    case 'ticktock':
      return false
    default:
      break
  }
  if (t.startsWith('vm:') || t.startsWith('modem:')) {
    return true
  }
  if (t.startsWith('boardrunner:')) {
    return false
  }
  if (t.startsWith('gadgetclient:')) {
    return true
  }
  const route = parsetarget(t)
  if (FORWARD_CTS_ROUTE_TARGET.has(route.target)) {
    return true
  }
  return FORWARD_CTS_ROUTE_PATH.has(route.path)
}

/** True = forward main thread → heavy worker ([`platform.ts`](../platform.ts)). */
export function shouldforwardclienttoheavy(message: MESSAGE): boolean {
  return heavyworkerbridgeallowed(message.target)
}

/** True = forward heavy worker → main thread ([`platform.ts`](../platform.ts)). */
export function shouldforwardheavytoclient(message: MESSAGE): boolean {
  return heavyworkerbridgeallowed(message.target)
}

/**
 * True = forward main → boardrunner worker ([`boardrunnerspace`](../boardrunnerspace.ts)); receives `ticktock`
 * when [`createforward`](../boardrunnerspace.ts) uses `allowticktock: true`.
 */
export function shouldforwardclienttoboardrunner(message: MESSAGE): boolean {
  switch (message.target) {
    case 'ticktock':
    case 'second':
    case 'ready':
      return true
    default: {
      const route = parsetarget(message.target)
      return FORWARD_CTB_ROUTE_TARGET.has(route.target)
    }
  }
}

/**
 * True = forward boardrunner worker → main ([`boardrunnerspace`](../boardrunnerspace.ts)); drops `*:changed`
 * jsonsync notifications; always allows `rxreplserver:*` upstream.
 */
export function shouldforwardboardrunnertoclient(message: MESSAGE): boolean {
  if (message.target.endsWith(':changed')) {
    return false
  }
  if (message.target.startsWith('rxreplserver:')) {
    return true
  }
  return shouldforwardservertoclient(message)
}
