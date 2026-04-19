/*
Strategy B: client-side rxrepl. push_ack / pull_response / notify / resync
can feed RxDB replication (see rxrepl/replication.ts).
*/
import { createdevice } from 'zss/device'

import { gadgetsyncingest } from './gadgetsyncdb'
import type { RXREPL_STREAM_DOCUMENT } from './rxrepl/types'

export const rxreplclientdevice = createdevice(
  'rxreplclient',
  [],
  (message) => {
    if (!rxreplclientdevice.session(message)) {
      return
    }
    switch (message.target) {
      case 'gadget_row': {
        const row = message.data as RXREPL_STREAM_DOCUMENT
        if (!row?.streamid?.startsWith('gadget:')) {
          break
        }
        const player = row.streamid.slice('gadget:'.length)
        const documentjson =
          typeof row.document === 'string'
            ? row.document
            : JSON.stringify(row.document)
        gadgetsyncingest(player, documentjson, row.rev)
        break
      }
      default:
        if (import.meta.env.DEV) {
          switch (message.target) {
            case 'push_ack':
            case 'pull_response':
            case 'notify':
            case 'resync':
              break
            default:
              break
          }
        }
        break
    }
  },
)
