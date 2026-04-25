import { createdevice } from 'zss/device'
import { deepcopy, isarray, ispresent, isstring } from 'zss/mapping/types'
import {
  boardfromboardstream,
  isboardstream,
  isflagsstream,
} from 'zss/memory/memorydirty'

import { rxreplpullresponse, rxreplpushack, rxreplrowdocument } from './api'
import type {
  RXREPL_PULL_REQUEST,
  RXREPL_PUSH_BATCH,
  RXREPL_STREAM_DOCUMENT,
} from './rxrepl/types'
import {
  streamreplplayerwritable,
  streamreplpublishfrommemory,
  streamreplserveradmitplayer,
  streamreplserverreadstream,
} from './streamreplserver'
import {
  memorysyncensureboardregistered,
  memorysynclazyensurechipflagsstreamforpusher,
  memorysyncreverseproject,
} from './vm/memorysimsync'

export const rxreplserverdevice = createdevice(
  'rxreplserver',
  [],
  (message) => {
    if (!rxreplserverdevice.session(message)) {
      return
    }
    switch (message.target) {
      case 'push_batch': {
        const batch = message.data as RXREPL_PUSH_BATCH
        if (!batch?.rows?.length) {
          rxreplpushack(rxreplserverdevice, message.player, { accepted: [] })
          break
        }
        const accepted: { streamid: string; rev: number }[] = []
        for (let i = 0; i < batch.rows.length; ++i) {
          const row = batch.rows[i]
          let entry = streamreplserverreadstream(row.streamid)
          if (
            !entry &&
            memorysynclazyensurechipflagsstreamforpusher(
              row.streamid,
              message.player,
            )
          ) {
            entry = streamreplserverreadstream(row.streamid)
          }
          if (
            !entry ||
            !streamreplplayerwritable(row.streamid, message.player)
          ) {
            continue
          }
          memorysyncreverseproject(row.streamid, rxreplrowdocument(row))
          streamreplpublishfrommemory(row.streamid)
          const after = streamreplserverreadstream(row.streamid)
          const rev = after?.rev ?? 0
          accepted.push({ streamid: row.streamid, rev })
        }
        rxreplpushack(rxreplserverdevice, message.player, { accepted })
        break
      }
      case 'pull_request': {
        const body = message.data as RXREPL_PULL_REQUEST
        const streamids = body?.streamids
        if (!isarray(streamids) || streamids.length === 0) {
          break
        }
        const player = message.player
        const documents: RXREPL_STREAM_DOCUMENT[] = []
        for (let i = 0; i < streamids.length; ++i) {
          const streamid = streamids[i]
          if (!isstring(streamid)) {
            continue
          }
          let entry = streamreplserverreadstream(streamid)
          if (!entry && isboardstream(streamid)) {
            const bid = boardfromboardstream(streamid)
            if (isstring(bid) && bid.length > 0) {
              if (ispresent(bid)) {
                memorysyncensureboardregistered(bid)
                streamreplserveradmitplayer(streamid, player, true)
                entry = streamreplserverreadstream(streamid)
              }
            }
          }
          if (
            !entry &&
            memorysynclazyensurechipflagsstreamforpusher(streamid, player)
          ) {
            entry = streamreplserverreadstream(streamid)
          }
          if (!entry) {
            continue
          }
          // `memorysyncadmitboardrunner` can race the client's pull; if the stream
          // exists but this player is not in `entry.players` yet, admit now so the
          // snapshot matches normal replication (join boardrunner blank logs).
          if (
            !entry.players.has(player) &&
            (isboardstream(streamid) || isflagsstream(streamid))
          ) {
            streamreplserveradmitplayer(streamid, player, true)
            entry = streamreplserverreadstream(streamid)
          }
          if (!entry?.players.has(player)) {
            continue
          }
          documents.push({
            streamid,
            document: deepcopy(entry.document),
            rev: entry.rev,
          })
        }
        const ck = body.checkpoint
        rxreplpullresponse(rxreplserverdevice, player, {
          checkpoint:
            ck && typeof ck === 'object' && isstring(ck.cursor)
              ? ck
              : { cursor: '' },
          documents,
        })
        break
      }
      default:
        break
    }
  },
)
