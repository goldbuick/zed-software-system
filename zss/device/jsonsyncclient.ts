/*
jsonsyncclient: client side of the differential sync loop.

Lives in every non-server process: browser bootstrap, heavy worker, boardrunner
worker. Stream state lives in an in-memory Map mirrored to RxDB. On every
shadow mutation (snapshot / serverpatch / antipatch) it broadcasts a
`jsonsync:changed` message for any observer device to consume.
*/
import { createdevice } from 'zss/device'
import {
  JSONSYNC_ANTI,
  JSONSYNC_CLIENT_STREAM,
  JSONSYNC_PATCH,
  JSONSYNC_SNAPSHOT,
  jsonsyncclientapplyanti,
  jsonsyncclientapplyserverpatch,
  jsonsyncclientapplysnapshot,
  jsonsyncclienthaspending,
  jsonsyncclientlocalupdate,
  jsonsynccreateclientstream,
} from 'zss/feature/jsonsync'
import { ispresent, isstring } from 'zss/mapping/types'

import {
  JSONSYNC_CHANGED,
  type MESSAGE,
  jsonsyncchanged,
  jsonsyncclientpatch,
  jsonsyncneedsnapshot,
} from './api'
import {
  jsonsyncclienthydratemapmissing,
  jsonsyncclientstreammap,
  jsonsyncensureclientdb,
} from './jsonsyncdb'

const streams = jsonsyncclientstreammap

// worker self-identity. The server admits a specific player to each stream
// and routes subsequent server->client traffic through `message.player =
// <admitted player>`. The jsonsync client captures the first non-empty
// player id it sees and uses it to stamp all outgoing clientpatches so the
// server can find the matching shadow (otherwise jsonsyncserveraccept sees
// `player=''` and returns `unknownclient`, which loses worker-originated
// edits).
let ownplayerid = ''

let clientready = false
const pendingclientmessages: MESSAGE[] = []

function captureownplayer(candidate: unknown): void {
  if (!isstring(candidate) || candidate.length === 0) {
    return
  }
  if (ownplayerid.length === 0) {
    ownplayerid = candidate
  }
}

export function jsonsyncclientreadownplayer(): string {
  return ownplayerid
}

export function jsonsyncclientreadstream(
  streamid: string,
): JSONSYNC_CLIENT_STREAM | undefined {
  return streams.get(streamid)
}

export function jsonsyncclientreadstreams(): Map<
  string,
  JSONSYNC_CLIENT_STREAM
> {
  return streams
}

// called by consumer code to publish a local edit. we compute a changeset vs
// the shadow, update local state, and emit a clientpatch upstream.
export function jsonsyncclientedit(
  streamid: string,
  producer: (document: unknown) => unknown,
) {
  const stream = streams.get(streamid)
  if (!ispresent(stream)) {
    return
  }
  const nextdoc = producer(stream.document)
  const local = jsonsyncclientlocalupdate(stream, nextdoc, streamid)
  streams.set(streamid, local.stream)
  if (local.patch.changes.length === 0) {
    return
  }
  jsonsyncclientpatch(jsonsyncclientdevice, ownplayerid, local.patch)
}

function emitchanged(
  streamid: string,
  reason: JSONSYNC_CHANGED['reason'],
  stream: JSONSYNC_CLIENT_STREAM,
) {
  jsonsyncchanged(jsonsyncclientdevice, {
    streamid,
    reason,
    cv: stream.cv,
    sv: stream.sv,
    document: stream.document,
  })
}

function processjsonsyncclientmessage(message: MESSAGE): void {
  if (!jsonsyncclientdevice.session(message)) {
    return
  }

  captureownplayer(message.player)

  switch (message.target) {
    case 'snapshot': {
      const snapshot = message.data as JSONSYNC_SNAPSHOT
      if (!ispresent(snapshot) || !isstring(snapshot.streamid)) {
        break
      }
      const previous =
        streams.get(snapshot.streamid) ?? jsonsynccreateclientstream()
      const next = jsonsyncclientapplysnapshot(previous, snapshot)
      streams.set(snapshot.streamid, next)
      emitchanged(snapshot.streamid, 'snapshot', next)
      break
    }
    case 'serverpatch': {
      const patch = message.data as JSONSYNC_PATCH
      if (!ispresent(patch) || !isstring(patch.streamid)) {
        break
      }
      const stream = streams.get(patch.streamid)
      if (!ispresent(stream)) {
        jsonsyncneedsnapshot(jsonsyncclientdevice, ownplayerid, patch.streamid)
        break
      }
      const result = jsonsyncclientapplyserverpatch(stream, patch)
      if (result.kind === 'ok') {
        streams.set(patch.streamid, result.stream)
        emitchanged(patch.streamid, 'serverpatch', result.stream)
      } else {
        jsonsyncneedsnapshot(jsonsyncclientdevice, ownplayerid, patch.streamid)
      }
      break
    }
    case 'antipatch': {
      const anti = message.data as JSONSYNC_ANTI
      if (!ispresent(anti) || !isstring(anti.streamid)) {
        break
      }
      const stream = streams.get(anti.streamid)
      if (!ispresent(stream)) {
        break
      }
      const result = jsonsyncclientapplyanti(stream, anti)
      if (result.kind === 'ok') {
        streams.set(anti.streamid, result.stream)
        emitchanged(anti.streamid, 'antipatch', result.stream)
      }
      break
    }
    case 'needsnapshot': {
      const data = message.data as { streamid?: string } | undefined
      const streamid = isstring(data?.streamid) ? data.streamid : ''
      if (streamid) {
        streams.delete(streamid)
        jsonsyncneedsnapshot(jsonsyncclientdevice, ownplayerid, streamid)
      }
      break
    }
    case 'poke': {
      const data = message.data as { streamid?: string } | undefined
      const streamid = isstring(data?.streamid) ? data.streamid : ''
      if (!streamid) {
        break
      }
      const stream = streams.get(streamid)
      if (!ispresent(stream)) {
        jsonsyncneedsnapshot(jsonsyncclientdevice, ownplayerid, streamid)
        break
      }
      if (jsonsyncclienthaspending(stream)) {
        break
      }
      jsonsyncclientpatch(jsonsyncclientdevice, ownplayerid, {
        streamid,
        cv: stream.cv,
        sv: stream.sv,
        changes: [],
      })
      break
    }
    default:
      break
  }
}

const jsonsyncclientdevice = createdevice('jsonsyncclient', [], (message) => {
  if (!clientready) {
    pendingclientmessages.push(message)
    return
  }
  processjsonsyncclientmessage(message)
})

void jsonsyncensureclientdb().then(async () => {
  await jsonsyncclienthydratemapmissing(streams)
  clientready = true
  const pending = pendingclientmessages.splice(0, pendingclientmessages.length)
  for (let i = 0; i < pending.length; ++i) {
    processjsonsyncclientmessage(pending[i])
  }
})

export { jsonsyncclientdevice }
