/*
Strategy B: sim-side rxrepl. push_batch merges documents into canonical MEMORY.
*/
import { createdevice } from 'zss/device'

import { rxreplclientgadgetrow, rxreplpushack, rxreplrowdocument } from './api'
import type { RXREPL_PUSH_BATCH } from './rxrepl/types'
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
            const gadgetplayer = row.streamid.slice('gadget:'.length)
            const prevrev = row.baserev ?? 0
            const rev = prevrev + 1
            accepted.push({ streamid: row.streamid, rev })
            rxreplclientgadgetrow(rxreplserverdevice, gadgetplayer, {
              streamid: row.streamid,
              document: rxreplrowdocument(row),
              rev,
            })
          } else {
            memorysyncreverseproject(row.streamid, rxreplrowdocument(row))
            accepted.push({
              streamid: row.streamid,
              rev: row.baserev !== undefined ? row.baserev + 1 : i,
            })
          }
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
