/*
Strategy B: sim-side rxrepl. push_batch merges documents into canonical MEMORY.
*/
import { createdevice } from 'zss/device'

import { rxreplpushack, rxreplrowdocument } from './api'
import type { RXREPL_PUSH_BATCH } from './rxrepl/types'
import {
  streamreplplayerwritable,
  streamreplpublishfrommemory,
  streamreplserverreadstream,
} from './streamreplserver'
import { memorysyncreverseproject } from './vm/memorysync'

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
          if (row.streamid.startsWith('gadget:')) {
            continue
          }
          const entry = streamreplserverreadstream(row.streamid)
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
      case 'pull_request':
      default:
        break
    }
  },
)
