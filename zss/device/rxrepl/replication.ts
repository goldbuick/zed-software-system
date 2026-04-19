/**
 * Strategy B: bridge rxrepl wire payloads to RxDB replication live pull streams.
 */
import { Observable } from 'rxjs'

import type { RXREPL_CHECKPOINT, RXREPL_PULL_RESPONSE } from './types'

type WithDeletedDoc = Record<string, unknown> & { _deleted?: boolean }

/** Matches RxDB RxReplicationPullStreamItem document branch. */
export type RXREPL_RX_PULL_ITEM =
  | {
      documents: WithDeletedDoc[]
      checkpoint: RXREPL_CHECKPOINT
    }
  | 'RESYNC'

export function rxreplresponsestopullstream(
  source: Observable<RXREPL_PULL_RESPONSE>,
): Observable<RXREPL_RX_PULL_ITEM> {
  return new Observable((sub) => {
    const subsrc = source.subscribe({
      next(resp) {
        sub.next({
          checkpoint: resp.checkpoint,
          documents: resp.documents as WithDeletedDoc[],
        })
      },
      error(e) {
        sub.error(e)
      },
      complete() {
        sub.complete()
      },
    })
    return () => subsrc.unsubscribe()
  })
}
