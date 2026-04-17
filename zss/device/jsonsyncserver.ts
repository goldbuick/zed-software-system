/*
jsonsyncserver: server side of the differential sync loop.

Lives in simspace. Holds the authoritative document for each streamid and a
per-player shadow+[cv,sv]+writable flag. VM code calls the exported register /
admit / update / close helpers. Client messages (jsonsyncserver:*) are handled
via the device bus.
*/
import { createdevice } from 'zss/device'
import {
  JSONSYNC_PATCH,
  JSONSYNC_SERVER_STREAM,
  JSONSYNC_STREAM_OPTIONS,
  jsonsynccreateserverstream,
  jsonsyncserveraccept,
  jsonsyncserveradmit,
  jsonsyncserverbuildpatches,
  jsonsyncserverremove,
  jsonsyncserverupdatedoc,
} from 'zss/feature/jsonsync'
import { deepcopy, ispresent, isstring } from 'zss/mapping/types'

import {
  jsonsyncantipatch,
  jsonsyncserverpatch,
  jsonsyncserversnapshotrequest,
  jsonsyncsnapshot,
} from './api'

const streams = new Map<string, JSONSYNC_SERVER_STREAM>()

function broadcastpatches(streamid: string) {
  const stream = streams.get(streamid)
  if (!ispresent(stream)) {
    return
  }
  const built = jsonsyncserverbuildpatches(stream, streamid)
  streams.set(streamid, built.stream)
  for (let i = 0; i < built.patches.length; ++i) {
    const entry = built.patches[i]
    jsonsyncserverpatch(jsonsyncserverdevice, entry.player, entry.patch)
  }
}

export function jsonsyncserverregister(
  streamid: string,
  document: unknown,
  options?: JSONSYNC_STREAM_OPTIONS,
) {
  streams.set(streamid, jsonsynccreateserverstream(document, options))
}

export function jsonsyncserveradmitplayer(
  streamid: string,
  player: string,
  writable: boolean,
) {
  const stream = streams.get(streamid)
  if (!ispresent(stream)) {
    return
  }
  const admit = jsonsyncserveradmit(stream, player, writable)
  streams.set(streamid, admit.stream)
  jsonsyncsnapshot(jsonsyncserverdevice, player, {
    ...admit.snapshot,
    streamid,
  })
}

export function jsonsyncserverupdate(streamid: string, nextdoc: unknown) {
  const stream = streams.get(streamid)
  if (!ispresent(stream)) {
    return
  }
  streams.set(streamid, jsonsyncserverupdatedoc(stream, nextdoc))
  broadcastpatches(streamid)
}

export function jsonsyncserverclose(streamid: string) {
  streams.delete(streamid)
}

export function jsonsyncserverdropplayer(streamid: string, player: string) {
  const stream = streams.get(streamid)
  if (!ispresent(stream)) {
    return
  }
  streams.set(streamid, jsonsyncserverremove(stream, player))
}

export function jsonsyncserverreadstream(
  streamid: string,
): JSONSYNC_SERVER_STREAM | undefined {
  return streams.get(streamid)
}

const jsonsyncserverdevice = createdevice('jsonsyncserver', [], (message) => {
  if (!jsonsyncserverdevice.session(message)) {
    return
  }

  switch (message.target) {
    case 'clientpatch': {
      const patch = message.data as JSONSYNC_PATCH
      if (!ispresent(patch) || !isstring(patch.streamid)) {
        break
      }
      const stream = streams.get(patch.streamid)
      if (!ispresent(stream)) {
        jsonsyncserversnapshotrequest(
          jsonsyncserverdevice,
          message.player,
          patch.streamid,
        )
        break
      }
      const result = jsonsyncserveraccept(stream, message.player, patch)
      switch (result.kind) {
        case 'ok':
          streams.set(patch.streamid, result.stream)
          broadcastpatches(patch.streamid)
          break
        case 'readonlyanti':
          streams.set(patch.streamid, result.stream)
          jsonsyncantipatch(jsonsyncserverdevice, message.player, result.anti)
          break
        case 'versionmismatch':
        case 'unknownclient':
          jsonsyncserversnapshotrequest(
            jsonsyncserverdevice,
            message.player,
            patch.streamid,
          )
          break
      }
      break
    }
    case 'needsnapshot': {
      const data = message.data as { streamid?: string } | undefined
      const streamid = isstring(data?.streamid) ? data.streamid : ''
      const stream = streams.get(streamid)
      if (!ispresent(stream)) {
        break
      }
      const state = stream.clients.get(message.player)
      if (!ispresent(state)) {
        break
      }
      jsonsyncsnapshot(jsonsyncserverdevice, message.player, {
        streamid,
        cv: state.cv,
        sv: state.sv,
        document: deepcopy(stream.document),
        arrayidentitykeys: stream.arrayidentitykeys,
      })
      break
    }
    default:
      break
  }
})
