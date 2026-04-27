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
  rxstreamreplplayerwritable,
  rxstreamreplpublishfrommemory,
  rxstreamreplserveradmitplayer,
  rxstreamreplserverreadstream,
} from './rxstreamreplserver'
import {
  memorysyncensureboardregistered,
  memorysynclazyensurechipflagsstreamforpusher,
  memorysynclazyensuresynthflagsstreamforpusher,
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
          let entry = rxstreamreplserverreadstream(row.streamid)
          if (
            !entry &&
            memorysynclazyensurechipflagsstreamforpusher(
              row.streamid,
              message.player,
            )
          ) {
            entry = rxstreamreplserverreadstream(row.streamid)
          }
          if (
            !entry &&
            memorysynclazyensuresynthflagsstreamforpusher(
              row.streamid,
              message.player,
            )
          ) {
            entry = rxstreamreplserverreadstream(row.streamid)
          }
          if (
            !entry ||
            !rxstreamreplplayerwritable(row.streamid, message.player)
          ) {
            continue
          }
          memorysyncreverseproject(row.streamid, rxreplrowdocument(row))
          rxstreamreplpublishfrommemory(row.streamid)
          const after = rxstreamreplserverreadstream(row.streamid)
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
          let entry = rxstreamreplserverreadstream(streamid)
          if (!entry && isboardstream(streamid)) {
            const bid = boardfromboardstream(streamid)
            if (isstring(bid) && bid.length > 0) {
              if (ispresent(bid)) {
                memorysyncensureboardregistered(bid)
                rxstreamreplserveradmitplayer(streamid, player, true)
                entry = rxstreamreplserverreadstream(streamid)
              }
            }
          }
          if (
            !entry &&
            memorysynclazyensurechipflagsstreamforpusher(streamid, player)
          ) {
            entry = rxstreamreplserverreadstream(streamid)
          }
          if (
            !entry &&
            memorysynclazyensuresynthflagsstreamforpusher(streamid, player)
          ) {
            entry = rxstreamreplserverreadstream(streamid)
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
            rxstreamreplserveradmitplayer(streamid, player, true)
            entry = rxstreamreplserverreadstream(streamid)
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
