import { Subject, take } from 'rxjs'

import { rxreplresponsestopullstream } from '../replication'
import type { RXREPL_PULL_RESPONSE } from '../types'

describe('rxreplresponsestopullstream', () => {
  it('maps pull responses to replication-shaped items', (done) => {
    const src = new Subject<RXREPL_PULL_RESPONSE>()
    const out = rxreplresponsestopullstream(src)
    out.pipe(take(1)).subscribe({
      next(item) {
        if (item === 'RESYNC') {
          throw new Error('unexpected resync')
        }
        expect(item.checkpoint.cursor).toBe('1')
        expect(item.documents).toHaveLength(1)
        expect(item.documents[0]).toMatchObject({
          streamid: 'memory',
          document: { x: 1 },
          rev: 1,
        })
        done()
      },
      error: done,
    })
    src.next({
      checkpoint: { cursor: '1' },
      documents: [{ streamid: 'memory', document: { x: 1 }, rev: 1 }],
    })
  })
})
