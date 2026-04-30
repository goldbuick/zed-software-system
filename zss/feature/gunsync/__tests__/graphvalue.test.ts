/**
 * @jest-environment node
 */
import {
  type Gunsyncgunchain,
  gunsyncputobjecttograph,
} from 'zss/feature/gunsync/graphvalue'

describe('gunsync graphvalue', () => {
  it('never calls get with an empty key when object has empty-string property', () => {
    const gotkeys: string[] = []
    const mocknode: Gunsyncgunchain = {
      get(k: string) {
        gotkeys.push(k)
        if (k.length === 0) {
          throw new Error('gun would reject 0-length key')
        }
        return mocknode
      },
      put() {
        return mocknode
      },
    }
    gunsyncputobjecttograph(
      mocknode,
      { '': 1, a: 2 } as Record<string, unknown>,
      0,
    )
    expect(gotkeys).toContain('a')
    expect(gotkeys).not.toContain('')
  })
})
