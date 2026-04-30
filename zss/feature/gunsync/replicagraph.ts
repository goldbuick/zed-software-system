import {
  type GunsyncReplica,
  gunsyncisapplyingfromgun,
  gunsyncroomkey,
} from './replica'
import { type Gunsyncgunchain, gunsyncputbooktograph } from './graphvalue'

import { roomgun } from './roommirror'

/** Write replicated MEMORY-shaped fields into Gun (local merge + mesh outbound). Skips during subscriber MEMORY apply to avoid loops. */
export function gunsyncreplicatograph(replica: GunsyncReplica): void {
  const roomkey = gunsyncroomkey()
  if (!roomkey || gunsyncisapplyingfromgun()) {
    return
  }
  const g = roomgun as unknown as Gunsyncgunchain
  const rootchain = g.get('zss').get(roomkey).get('replica')
  rootchain.get('operator').put(replica.operator)
  rootchain.get('topic').put(replica.topic)
  rootchain.get('session').put(replica.session)
  rootchain.get('halt').put(replica.halt)
  rootchain.get('simfreeze').put(replica.simfreeze)
  rootchain.get('software').get('main').put(replica.software.main)
  rootchain.get('software').get('temp').put(replica.software.temp)
  const bookschain = rootchain.get('books')
  const ids = Object.keys(replica.books)
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i]!
    if (id.length === 0) {
      continue
    }
    const book = replica.books[id]!
    gunsyncputbooktograph(bookschain, id, book)
  }
}
