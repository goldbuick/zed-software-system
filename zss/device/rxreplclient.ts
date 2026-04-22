import { createdevice, parsetarget } from 'zss/device'
import { isarray, ispresent, isstring } from 'zss/mapping/types'

import { type MESSAGE } from './api'
import {
  type STREAMREPL_CLIENT_STREAM,
  streamreplclienthydratemapmissing,
  streamreplclientstreammap,
  streamreplensureclientdb,
  streamreplmirrorputlocal,
  streamreplmirrorsetnonotify,
  streamreplregisterreplicationboardnotify,
  streamreplregisterstreamchangeddevice,
} from './netsim'
import { streamreplpushawaitnotify } from './rxrepl/streamreplpushawait'
import {
  initStreamReplRxReplications,
  streamreplreplicationfeedpullresponse,
  streamreplreplicationfeedstreamrow,
  streamreplreplicationisactive,
  streamreplreplicationresynceverything,
} from './rxrepl/streamreplreplicationinit'
import type {
  RXREPL_PULL_RESPONSE,
  RXREPL_PUSH_ACK,
  RXREPL_STREAM_DOCUMENT,
} from './rxrepl/types'

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
  return streamreplclientstreammap.get(streamid)
}

export function rxreplclientreadstreams(): ReadonlyMap<
  string,
  STREAMREPL_CLIENT_STREAM
> {
  return streamreplclientstreammap as unknown as ReadonlyMap<
    string,
    STREAMREPL_CLIENT_STREAM
  >
}

function applystreamrow(
  payload: RXREPL_STREAM_DOCUMENT,
  options?: { deferBoardNotify?: boolean },
): boolean {
  if (!ispresent(payload) || !isstring(payload.streamid)) {
    return false
  }
  const prev = streamreplclientstreammap.get(payload.streamid)
  const rev = payload.rev
  if (ispresent(prev) && rev < prev.rev) {
    return false
  }
  const next: STREAMREPL_CLIENT_STREAM = {
    document: payload.document,
    rev,
  }
  if (streamreplreplicationisactive()) {
    streamreplreplicationfeedstreamrow(payload)
    streamreplmirrorsetnonotify(payload.streamid, next)
  } else {
    streamreplmirrorputlocal(payload.streamid, next)
  }
  const isboard = payload.streamid.startsWith('board:')
  if (isboard && !options?.deferBoardNotify) {
    notifyRxreplBoardRowApplied()
  }
  return isboard
}

function applypullresponsedocs(
  message: MESSAGE,
  body: RXREPL_PULL_RESPONSE,
): void {
  streamreplreplicationfeedpullresponse(body)
  const docs = body.documents
  if (!isarray(docs)) {
    return
  }
  captureownplayer(message.player)
  let anyboard = false
  if (streamreplreplicationisactive()) {
    for (let i = 0; i < docs.length; ++i) {
      const doc = docs[i]
      if (!ispresent(doc) || !isstring(doc.streamid)) {
        continue
      }
      const prev = streamreplclientstreammap.get(doc.streamid)
      if (ispresent(prev) && doc.rev < prev.rev) {
        continue
      }
      streamreplmirrorsetnonotify(doc.streamid, {
        document: doc.document,
        rev: doc.rev,
      })
      if (doc.streamid.startsWith('board:')) {
        anyboard = true
      }
    }
  } else {
    for (let i = 0; i < docs.length; ++i) {
      if (
        applystreamrow(docs[i], {
          deferBoardNotify: true,
        })
      ) {
        anyboard = true
      }
    }
  }
  if (anyboard) {
    notifyRxreplBoardRowApplied()
  }
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
  if (localtarget === 'push_ack' && ispresent(message.data)) {
    streamreplpushawaitnotify(message.data as RXREPL_PUSH_ACK)
  }
  if (localtarget === 'resync') {
    streamreplreplicationresynceverything()
    return
  }
  if (localtarget === 'notify') {
    return
  }
  // Replication payloads must not wait on `session(message)` (often still false on
  // the boardrunner worker when sim `admit` + `pull_response`/`stream_row` land in
  // the same tick as the first `ticktock` — H-G had hasRxRow:false after H-P).
  if (localtarget === 'pull_response' && ispresent(message.data)) {
    applypullresponsedocs(message, message.data as RXREPL_PULL_RESPONSE)
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
    if (localtarget === 'resync') {
      streamreplreplicationresynceverything()
      return
    }
    // Apply repl rows before `clientready`: session gating can still be false while
    // `message.session` is set, so do not skip early `stream_row` / `pull_response`.
    if (localtarget === 'stream_row' && ispresent(message.data)) {
      captureownplayer(message.player)
      applystreamrow(message.data as RXREPL_STREAM_DOCUMENT)
    }
    if (localtarget === 'pull_response' && ispresent(message.data)) {
      applypullresponsedocs(message, message.data as RXREPL_PULL_RESPONSE)
    }
    pendingclientmessages.push(message)
    return
  }
  processrxreplclientmessage(message)
})

streamreplregisterstreamchangeddevice(rxreplclientdevice)
streamreplregisterreplicationboardnotify(notifyRxreplBoardRowApplied)

void streamreplensureclientdb().then(async () => {
  await streamreplclienthydratemapmissing()
  // `replicateRxCollection` leaves Rx subscriptions open; skip in Jest unless opted in.
  if (
    typeof process === 'undefined' ||
    !process.env.JEST_WORKER_ID ||
    process.env.STREAMREPL_RX_REPL === '1'
  ) {
    await initStreamReplRxReplications({
      device: rxreplclientdevice,
      getOwnPlayer: rxreplclientreadownplayer,
    })
  }
  clientready = true
  const pending = pendingclientmessages.splice(0, pendingclientmessages.length)
  for (let i = 0; i < pending.length; ++i) {
    processrxreplclientmessage(pending[i])
  }
})

export { rxreplclientdevice }
