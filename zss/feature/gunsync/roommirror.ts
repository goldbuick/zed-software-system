/** Ephemeral in-memory Gun graph per worker; optional `opt.peers` relay is future hardening. */
import Gun from 'gun'

import type { GunsyncPayload } from './replica'
import { gunsyncroomkey } from './replica'

export const roomgun = Gun({ peers: [] })

export function gunmeshmirrorreplica(blob: GunsyncPayload): void {
  const room = gunsyncroomkey()
  if (!room) {
    return
  }
  roomgun.get('zss').get(room).get('gunsync').put({
    v: blob.v,
    source: blob.source,
    at: Date.now(),
  })
}
