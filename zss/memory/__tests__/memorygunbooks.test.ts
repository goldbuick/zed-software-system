/**
 * @jest-environment node
 */
import { memorybookfromwire } from '../memorygunbooks'
import type { BOOK } from '../types'

function minimalbook(id: string): BOOK {
  return {
    id,
    name: 'main',
    timestamp: 1,
    activelist: [],
    pages: [{ id: 'pg1', code: 'say hi' }],
    flags: {},
  }
}

describe('memorygunbooks', () => {
  it('wire-shaped tree round-trips via memorybookfromwire', () => {
    const b0 = minimalbook('b1')
    const tree = {
      name: b0.name,
      timestamp: b0.timestamp,
      flags: b0.flags,
      pages: {
        $0: { codepage: { id: 'pg1', code: 'say hi' } },
      },
      activelist: {},
    }
    const b1 = memorybookfromwire(tree, 'b1')
    expect(b1).toBeDefined()
    expect(b1!.id).toBe('b1')
    expect(b1!.pages[0].code).toBe('say hi')
    expect(b1!.activelist).toEqual([])
  })

  it('unprojects legacy JSON string book', () => {
    const b0 = minimalbook('b1')
    const s = JSON.stringify(b0)
    const b1 = memorybookfromwire(s, 'b1')
    expect(b1?.pages[0]?.code).toBe('say hi')
  })
})
