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
  jsonsyncserverbuildpatchfor,
  jsonsyncserverlistpeers,
  jsonsyncserverremove,
  jsonsyncserverupdatedoc,
} from 'zss/feature/jsonsync'
import { deepcopy, ispresent, isstring } from 'zss/mapping/types'

import {
  jsonsyncantipatch,
  jsonsyncpoke,
  jsonsyncserverpatch,
  jsonsyncserversnapshotrequest,
  jsonsyncsnapshot,
} from './api'

const streams = new Map<string, JSONSYNC_SERVER_STREAM>()

// poke every player in the stream. optionally skip one player (the originator
// of a just-accepted clientpatch). peers respond by running their own diff
// cycle and sending a clientpatch, which the server turns into a targeted
// serverpatch via jsonsyncserverbuildpatchfor on receipt.
function pokepeers(streamid: string, excludeplayer?: string) {
  const stream = streams.get(streamid)
  if (!ispresent(stream)) {
    return
  }
  const peers = jsonsyncserverlistpeers(stream, excludeplayer)
  for (let i = 0; i < peers.length; ++i) {
    jsonsyncpoke(jsonsyncserverdevice, peers[i], streamid)
  }
}

// build a targeted catch-up patch for a single player. used after an accept to
// close the cv/sv loop with the originator (no-op in the happy path; carries
// fuzzy-vs-strict drift in the rare concurrent-edit case).
function pushcatchuppatch(streamid: string, player: string) {
  const stream = streams.get(streamid)
  if (!ispresent(stream)) {
    return
  }
  const built = jsonsyncserverbuildpatchfor(stream, streamid, player)
  streams.set(streamid, built.stream)
  if (ispresent(built.patch)) {
    jsonsyncserverpatch(jsonsyncserverdevice, player, built.patch)
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
  // VM-driven change has no originator; poke everyone.
  pokepeers(streamid)
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
          // close the cv/sv loop with the originator. empty in the happy path
          // after a real edit; non-empty when fuzzy drift occurred, or when
          // this clientpatch was itself an empty catch-up ping (poke response).
          pushcatchuppatch(patch.streamid, message.player)
          // only propagate to peers when the originator actually changed
          // something. an empty clientpatch means "catch me up" not "broadcast".
          if (patch.changes.length > 0) {
            pokepeers(patch.streamid, message.player)
          }
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
