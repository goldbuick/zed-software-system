/*
Strategy B: client-side rxrepl. memory/board stream_row, push_ack, pull_response,
notify, resync. Persisted streams emit `${streamid}:changed` from jsonsyncdb.
*/
import { createdevice } from 'zss/device'
import { ispresent, isstring } from 'zss/mapping/types'

import { type MESSAGE } from './api'
import {
  type STREAMREPL_CLIENT_STREAM,
  streamreplclienthydratemapmissing,
  streamreplclientstreammap,
  streamreplensureclientdb,
  streamreplregisterstreamchangeddevice,
} from './jsonsyncdb'
import type { RXREPL_PUSH_ACK, RXREPL_STREAM_DOCUMENT } from './rxrepl/types'

const streams = streamreplclientstreammap

let ownplayerid = ''

function captureownplayer(candidate: unknown): void {
  if (!isstring(candidate) || candidate.length === 0) {
    return
  }
  if (ownplayerid.length === 0) {
    ownplayerid = candidate
  }
}

export function rxreplclientreadownplayer(): string {
  return ownplayerid
}

/** Test hook: pretend the device already captured `player` from inbound traffic. */
export function rxreplclientsetownplayerfortests(player: string): void {
  ownplayerid = player
}

export function rxreplclientreadstream(
  streamid: string,
): STREAMREPL_CLIENT_STREAM | undefined {
  return streams.get(streamid)
}

export function rxreplclientreadstreams(): Map<
  string,
  STREAMREPL_CLIENT_STREAM
> {
  return streams
}

function applystreamrow(payload: RXREPL_STREAM_DOCUMENT): void {
  if (!ispresent(payload) || !isstring(payload.streamid)) {
    return
  }
  const prev = streams.get(payload.streamid)
  const rev = payload.rev
  if (ispresent(prev) && rev < prev.rev) {
    return
  }
  const next: STREAMREPL_CLIENT_STREAM = {
    document: payload.document,
    rev,
  }
  streams.set(payload.streamid, next)
}

let clientready = false
const pendingclientmessages: MESSAGE[] = []

function processrxreplclientmessage(message: MESSAGE): void {
  if (!rxreplclientdevice.session(message)) {
    return
  }

  captureownplayer(message.player)

  switch (message.target) {
    case 'stream_row': {
      const row = message.data as RXREPL_STREAM_DOCUMENT
      applystreamrow(row)
      break
    }
    case 'push_ack': {
      const ack = message.data as RXREPL_PUSH_ACK
      if (!ack?.accepted?.length) {
        break
      }
      for (let i = 0; i < ack.accepted.length; ++i) {
        const a = ack.accepted[i]
        const cur = streams.get(a.streamid)
        if (ispresent(cur) && a.rev > cur.rev) {
          cur.rev = a.rev
          streams.set(a.streamid, cur)
        }
      }
      break
    }
    default:
      break
  }
}

const rxreplclientdevice = createdevice('rxreplclient', [], (message) => {
  if (!clientready) {
    pendingclientmessages.push(message)
    return
  }
  processrxreplclientmessage(message)
})

streamreplregisterstreamchangeddevice(rxreplclientdevice)

void streamreplensureclientdb().then(async () => {
  await streamreplclienthydratemapmissing(streams)
  clientready = true
  const pending = pendingclientmessages.splice(0, pendingclientmessages.length)
  for (let i = 0; i < pending.length; ++i) {
    processrxreplclientmessage(pending[i])
  }
})

export { rxreplclientdevice }
