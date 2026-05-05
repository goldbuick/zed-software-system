import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { deepcopy, isequal, ispresent } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import type { MEMORY_ROOT } from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

function makeroot(partial: Partial<MEMORY_ROOT> = {}): MEMORY_ROOT {
  return {
    halt: false,
    topic: '',
    session: 'sess',
    operator: 'op',
    simfreeze: false,
    software: { main: 'mainbook', temp: '' },
    books: {},
    loaders: {},
    ...partial,
  }
}

describe('memoryreadrootsync jsonpipe parity', () => {
  it('producer emitdiff and consumer applyremote round-trip', () => {
    const a = makeroot({ operator: 'p1' })
    const b = makeroot({ operator: 'p2', topic: 't1' })

    const producer = createjsonpipe<MEMORY_ROOT>(deepcopy(a), () => true)
    const patch = producer.emitdiff(b)
    expect(patch.length).toBeGreaterThan(0)

    const consumer = createjsonpipe<MEMORY_ROOT>(deepcopy(a), () => true)
    const basereplica = consumer.applyfullsync(a)
    const applied = consumer.applyremote(basereplica, patch)
    expect(ispresent(applied)).toBe(true)
    expect(isequal(applied, b)).toBe(true)
  })

  it('omits book timestamp from wire when using memoryrootshouldemitpath', () => {
    const book: BOOK = {
      id: 'b1',
      name: 'main',
      timestamp: 1,
      activelist: [],
      pages: [],
      flags: 'flags1',
    }
    const a = makeroot({ books: { b1: book } })
    const b = makeroot({
      books: { b1: { ...book, timestamp: 999 } },
    })

    const producer = createjsonpipe<MEMORY_ROOT>(
      deepcopy(a),
      memoryrootshouldemitpath,
    )
    expect(producer.emitdiff(b)).toEqual([])
  })

  it('omits loaders from wire when using memoryrootshouldemitpath', () => {
    const a = makeroot({ loaders: {} })
    const b = makeroot({ loaders: { l1: 'code' } })

    const producer = createjsonpipe<MEMORY_ROOT>(
      deepcopy(a),
      memoryrootshouldemitpath,
    )
    expect(producer.emitdiff(b)).toEqual([])
  })

  it('chains two ticks', () => {
    const r0 = makeroot({ session: 's0' })
    const r1 = makeroot({ session: 's1' })
    const r2 = makeroot({ session: 's2', halt: true })

    const producer = createjsonpipe<MEMORY_ROOT>(deepcopy(r0), () => true)
    const p1 = producer.emitdiff(r1)
    const p2 = producer.emitdiff(r2)

    const consumer = createjsonpipe<MEMORY_ROOT>(deepcopy(r0), () => true)
    let replica = consumer.applyfullsync(r0)
    replica = consumer.applyremote(replica, p1)!
    replica = consumer.applyremote(replica, p2)!
    expect(isequal(replica, r2)).toBe(true)
  })
})
