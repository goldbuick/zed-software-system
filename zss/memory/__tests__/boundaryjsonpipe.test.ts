import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { deepcopy, isequal, ispresent } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'

describe('boundary-scoped jsonpipe', () => {
  it('emitdiff and applyremote round-trip on a boundary-sized document', () => {
    type BoundaryDoc = { code: string; n: number }
    const a: BoundaryDoc = { code: 'a', n: 1 }
    const b: BoundaryDoc = { code: 'a', n: 2 }

    const producer = createjsonpipe<BoundaryDoc>(deepcopy(a), memoryrootshouldemitpath)
    const patch = producer.emitdiff(b)
    expect(patch.length).toBeGreaterThan(0)

    const consumer = createjsonpipe<BoundaryDoc>(deepcopy(a), memoryrootshouldemitpath)
    const base = consumer.applyfullsync(a)
    const applied = consumer.applyremote(base, patch)
    expect(ispresent(applied)).toBe(true)
    expect(isequal(applied, b)).toBe(true)
  })
})
