import { decodepeerwire, encodepeerwire } from 'zss/feature/peerzstdwire'
import { ensurezstdwasm } from 'zss/feature/zstdwasm'

describe('peerzstdwire', () => {
  beforeAll(async () => {
    await ensurezstdwasm()
  })

  it('round-trips a minimal MESSAGE', () => {
    const message = {
      session: 's1',
      player: 'p1',
      id: 'i1',
      sender: 'snd',
      target: 'ticktock',
      data: { n: 42 },
    }
    const wire = encodepeerwire(message)
    expect(wire.byteLength).toBeGreaterThan(0)
    const back = decodepeerwire(wire)
    expect(back).toEqual(message)
  })
})
