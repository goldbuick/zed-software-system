/**
 * Routing matrix for [`forward.ts`](../forward.ts): representative `message.target` values from
 * [`api.ts`](../api.ts) `device.emit` families and edge cases. Extend this table when adding new
 * first-class transport targets.
 *
 * - **stc** — `shouldforwardservertoclient` (sim → main; PeerJS host → join)
 * - **cts** — `shouldforwardclienttoserver` (main/heavy/boardrunner → sim)
 * - **cth** / **htc** — client ↔ heavy worker ([`platform.ts`](../../platform.ts))
 * - **ctb** — `shouldforwardclienttoboardrunner`
 * - **brtc** — `shouldforwardboardrunnertoclient` (boardrunner → main → sim path)
 * - **peersrv** — `shouldnotforwardonpeerserver` (block host→join when true)
 * - **peercli** — `shouldnotforwardonpeerclient` (block join→host when true)
 */
import { createmessage } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  shouldforwardboardrunnertoclient,
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoheavy,
  shouldforwardclienttoserver,
  shouldforwardheavytoclient,
  shouldforwardservertoclient,
  shouldnotforwardonpeerclient,
  shouldnotforwardonpeerserver,
} from 'zss/device/forward'

function routingmessage(target: string): MESSAGE {
  return createmessage('sess', 'p1', 'forward_inventory', target)
}

type routingrow = {
  target: string
  stc: boolean
  cts: boolean
  cth: boolean
  htc: boolean
  ctb: boolean
  brtc: boolean
  peersrv: boolean
  peercli: boolean
}

/** One representative per high-traffic prefix from api.ts; tweak booleans when routing rules change. */
const ROUTING_TABLE: routingrow[] = [
  // Clock / bare
  {
    target: 'ticktock',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: true,
    brtc: true,
    peersrv: false,
    peercli: true,
  },
  {
    target: 'second',
    stc: true,
    cts: false,
    cth: true,
    htc: true,
    ctb: true,
    brtc: true,
    peersrv: false,
    peercli: true,
  },
  {
    target: 'ready',
    stc: true,
    cts: false,
    cth: true,
    htc: true,
    ctb: true,
    brtc: true,
    peersrv: true,
    peercli: true,
  },
  // UI / log
  {
    target: 'log',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'toast',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  // vm / user (multiplayer hot paths)
  {
    target: 'vm:operator',
    stc: true,
    cts: true,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'user:input',
    stc: true,
    cts: true,
    cth: false,
    htc: false,
    ctb: true,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'user:pilotstart',
    stc: true,
    cts: true,
    cth: false,
    htc: false,
    ctb: true,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  // bridge / register / synth — sim → client namespaces
  {
    target: 'bridge:join',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'register:input',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'synth:play',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  // Heavy worker
  {
    target: 'heavy:ttsrequest',
    stc: true,
    cts: false,
    cth: true,
    htc: true,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'heavy:acklook',
    stc: true,
    cts: false,
    cth: true,
    htc: true,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  // Boardrunner-only on client → sim (blocked for cts); boardrunner worker routes
  {
    target: 'boardrunner:ownedboard',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: true,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'boardrunner:clearscroll',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: true,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  // Replication
  {
    target: 'rxreplclient:stream_row',
    stc: true,
    cts: false,
    cth: false,
    htc: false,
    ctb: true,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'rxreplserver:push_batch',
    stc: false,
    cts: true,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  {
    target: 'rxreplserver:pull_request',
    stc: false,
    cts: true,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  // Gadget / client paint
  {
    target: 'gadgetclient:paint',
    stc: true,
    cts: true,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: false,
  },
  // Jsonsync changed — dropped by boardrunner→client pass-through
  {
    target: 'memory:changed',
    stc: false,
    cts: false,
    cth: false,
    htc: false,
    ctb: false,
    brtc: false,
    peersrv: false,
    peercli: false,
  },
  // Unknown / not in allowlists
  {
    target: 'notroutable:xyzzy',
    stc: false,
    cts: false,
    cth: false,
    htc: false,
    ctb: false,
    brtc: false,
    peersrv: false,
    peercli: false,
  },
  // Nested peer leaf (modem:second blocks join→host)
  {
    target: 'modem:second',
    stc: true,
    cts: true,
    cth: false,
    htc: false,
    ctb: false,
    brtc: true,
    peersrv: false,
    peercli: true,
  },
]

describe('forward routing inventory (api.ts families)', () => {
  it.each(ROUTING_TABLE)(
    '$target matches routing matrix',
    (row: routingrow) => {
      const m = routingmessage(row.target)
      expect(shouldforwardservertoclient(m)).toBe(row.stc)
      expect(shouldforwardclienttoserver(m)).toBe(row.cts)
      expect(shouldforwardclienttoheavy(m)).toBe(row.cth)
      expect(shouldforwardheavytoclient(m)).toBe(row.htc)
      expect(shouldforwardclienttoboardrunner(m)).toBe(row.ctb)
      expect(shouldforwardboardrunnertoclient(m)).toBe(row.brtc)
      expect(shouldnotforwardonpeerserver(m)).toBe(row.peersrv)
      expect(shouldnotforwardonpeerclient(m)).toBe(row.peercli)
    },
  )
})
