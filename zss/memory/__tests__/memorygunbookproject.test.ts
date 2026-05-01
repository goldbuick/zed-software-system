/**
 * @jest-environment node
 */
import type { BOOK } from '../types'
import {
  memorybookunprojectfromgun,
  memorybookwiretree,
} from '../memorygunbookproject'

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

describe('memorygunbookproject', () => {
  it('wiretree then unproject round-trips', () => {
    const b0 = minimalbook('b1')
    const tree = memorybookwiretree(b0)
    const b1 = memorybookunprojectfromgun(tree, 'b1')
    expect(b1).toBeDefined()
    expect(b1!.id).toBe('b1')
    expect(b1!.pages[0]!.code).toBe('say hi')
    expect(b1!.activelist).toEqual([])
  })

  it('unprojects legacy JSON string book', () => {
    const b0 = minimalbook('b1')
    const s = JSON.stringify(b0)
    const b1 = memorybookunprojectfromgun(s, 'b1')
    expect(b1?.pages[0]?.code).toBe('say hi')
  })
})
