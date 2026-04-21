/*
Strategy B: client-side rxrepl. memory/board stream_row, push_ack, pull_response,
notify, resync. Persisted streams emit `${streamid}:changed` from jsonsyncdb.
*/
import { createdevice, parsetarget } from 'zss/device'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { type MESSAGE } from './api'
import {
  type STREAMREPL_CLIENT_STREAM,
  streamreplclienthydratemapmissing,
  streamreplclientstreammap,
  streamreplensureclientdb,
  streamreplregisterstreamchangeddevice,
} from './jsonsyncdb'
import type {
  RXREPL_PULL_RESPONSE,
  RXREPL_STREAM_DOCUMENT,
} from './rxrepl/types'

const streams = streamreplclientstreammap

/** Boardrunner registers once; avoids rxreplclient importing boardrunner. */
let rxreplboardrowapplied: (() => void) | undefined

export function registerRxreplBoardRowAppliedCallback(cb: () => void): void {
  rxreplboardrowapplied = cb
}

function notifyRxreplBoardRowApplied(): void {
  rxreplboardrowapplied?.()
}

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

function applystreamrow(
  payload: RXREPL_STREAM_DOCUMENT,
  options?: { deferBoardNotify?: boolean },
): boolean {
  if (!ispresent(payload) || !isstring(payload.streamid)) {
    return false
  }
  const prev = streams.get(payload.streamid)
  const rev = payload.rev
  if (ispresent(prev) && rev < prev.rev) {
    return false
  }
  const next: STREAMREPL_CLIENT_STREAM = {
    document: payload.document,
    rev,
  }
  streams.set(payload.streamid, next)
  const isboard = payload.streamid.startsWith('board:')
  if (isboard && !options?.deferBoardNotify) {
    notifyRxreplBoardRowApplied()
  }
  return isboard
}

let clientready = false
const pendingclientmessages: MESSAGE[] = []

/** Pending-queue replay calls this without `createdevice.handle` path folding. */
function rxrepllocalmessagetarget(target: string): string {
  const r = parsetarget(target)
  return r.target === 'rxreplclient' && r.path.length > 0 ? r.path : target
}

function processrxreplclientmessage(message: MESSAGE): void {
  const localtarget = rxrepllocalmessagetarget(message.target)
  // Replication payloads must not wait on `session(message)` (often still false on
  // the boardrunner worker when sim `admit` + `pull_response`/`stream_row` land in
  // the same tick as the first `ticktock` — H-G had hasRxRow:false after H-P).
  if (localtarget === 'pull_response' && ispresent(message.data)) {
    const body = message.data as RXREPL_PULL_RESPONSE
    const docs = body.documents
    if (isarray(docs)) {
      captureownplayer(message.player)
      let anyboard = false
      for (let i = 0; i < docs.length; ++i) {
        if (
          applystreamrow(docs[i], {
            deferBoardNotify: true,
          })
        ) {
          anyboard = true
        }
      }
      if (anyboard) {
        notifyRxreplBoardRowApplied()
      }
    }
    return
  }
  if (localtarget === 'stream_row' && ispresent(message.data)) {
    captureownplayer(message.player)
    applystreamrow(message.data as RXREPL_STREAM_DOCUMENT)
    return
  }

  if (!rxreplclientdevice.session(message)) {
    return
  }

  captureownplayer(message.player)

  switch (localtarget) {
    case 'push_ack':
      break
    default:
      break
  }
}

const rxreplclientdevice = createdevice('rxreplclient', [], (message) => {
  const localtarget = rxrepllocalmessagetarget(message.target)
  if (!clientready) {
    // Apply repl rows before `clientready`: session gating can still be false while
    // `message.session` is set, so do not skip early `stream_row` / `pull_response`.
    if (localtarget === 'stream_row' && ispresent(message.data)) {
      captureownplayer(message.player)
      applystreamrow(message.data as RXREPL_STREAM_DOCUMENT)
    }
    if (localtarget === 'pull_response' && ispresent(message.data)) {
      const body = message.data as RXREPL_PULL_RESPONSE
      const docs = body.documents
      if (isarray(docs)) {
        let anyboard = false
        for (let i = 0; i < docs.length; ++i) {
          if (
            applystreamrow(docs[i], {
              deferBoardNotify: true,
            })
          ) {
            anyboard = true
          }
        }
        if (anyboard) {
          notifyRxreplBoardRowApplied()
        }
      }
    }
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
