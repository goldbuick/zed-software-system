import type { DEVICE } from 'zss/device'
import { gunsyncrelay } from 'zss/device/api'

import { roomgun } from './roommirror'

/** Outbound Gun peer bridged to hub MESSAGE (serialized mesh frames only). */
type GunsyncRelayPeer = {
  id: string
  wire: { send: (raw: string | object) => void }
}

/** Virtual peer Gun attributes inbound frames from the hub relay. */
type GunsyncIngressPeer = {
  id: string
}

type GunsyncMesh = {
  hi: (peer: GunsyncRelayPeer) => void
  bye: (peer: GunsyncRelayPeer) => void
  hear: (raw: string | object, peer: GunsyncIngressPeer) => void
}

const inboundpeerbyplayer = new Map<string, GunsyncIngressPeer>()

function gunsyncingresspeer(forplayerid: string): GunsyncIngressPeer {
  let p = inboundpeerbyplayer.get(forplayerid)
  if (!p) {
    p = { id: forplayerid }
    inboundpeerbyplayer.set(forplayerid, p)
  }
  return p
}

let relaysidepeer: GunsyncRelayPeer | null = null

let relaydevice: DEVICE | undefined

let relayplayer = ''

/** Keep relay routing current (player may change across boot/session). Re-hi mesh peer when missing so early ticks still emit wire frames after boot handshake order varies. */
export function gunsyncensureboardrunnerrelay(
  device: DEVICE,
  player: string,
): void {
  relaydevice = device
  relayplayer = player
  if (relaysidepeer?.id !== player) {
    gunsyncbootstrapboardrunnerhubpeer(device, player)
  }
}

/** Boardrunner bootstrap: synthetic mesh peer whose `wire.send` fans out opaque frames. Call on `boot` after session is wired. */
export function gunsyncbootstrapboardrunnerhubpeer(
  device: DEVICE,
  player: string,
): void {
  relaydevice = device
  relayplayer = player
  const mesh = gunsyncmeshfromroomgun()
  const prior = relaysidepeer
  if (prior !== null && prior !== undefined) {
    mesh.bye(prior)
    relaysidepeer = null
  }
  relaysidepeer = {
    id: player,
    wire: {
      send(raw: string | object) {
        relaysendserialized(raw)
      },
    },
  }
  mesh.hi(relaysidepeer)
}

function relaysendserialized(raw: string | object): void {
  const d = relaydevice
  const p = relayplayer
  if (!(d !== undefined && p !== '')) {
    return
  }
  if (typeof raw === 'string') {
    gunsyncrelay(d, p, raw)
    return
  }
  gunsyncrelay(d, p, JSON.stringify(raw))
}

let pendingboardrunnerwirenotify = false

export function gunsyncpendingwireingress(): void {
  pendingboardrunnerwirenotify = true
}

/** Clear and return whether a hub wire ingress intended a boardrunner follow-up (`boardrunner:gunsync`). Call only after a successful MEMORY apply from graph staging. */
export function gunsyncconsumewirenotifyaftersuccessfulapply(): boolean {
  const v = pendingboardrunnerwirenotify
  pendingboardrunnerwirenotify = false
  return v
}

/** Sim ingress: opaque mesh batches into local Gun.graph (MEMORY follows subscriber). */
export function gunsmeshpushwireframetograph(
  forplayerid: string,
  raw: string,
): void {
  gunsyncpendingwireingress()
  const mesh = gunsyncmeshfromroomgun()
  mesh.hear(raw, gunsyncingresspeer(forplayerid))
}

export function gunsyncmeshfromroomgun(): GunsyncMesh {
  const g = roomgun as unknown as {
    _: {
      dup?: unknown
      opt?: { mesh?: GunsyncMesh; peers?: unknown }
      root?: unknown
    }
  }
  const atom = g._
  const opt = atom?.opt
  const mesh = opt?.mesh
  if (!(mesh?.hear instanceof Function && mesh?.hi instanceof Function)) {
    throw new Error('gunsync: Gun mesh unavailable')
  }
  return mesh
}
