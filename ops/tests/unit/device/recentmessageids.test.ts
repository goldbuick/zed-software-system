import { createrecentmessageids } from 'zss/device/recentmessageids'

describe('createrecentmessageids', () => {
  it('tracks ids and reports has', () => {
    const recent = createrecentmessageids(4)
    expect(recent.has('a')).toBe(false)
    recent.add('a')
    expect(recent.has('a')).toBe(true)
  })

  it('evicts oldest when over cap', () => {
    const recent = createrecentmessageids(2)
    recent.add('a')
    recent.add('b')
    recent.add('c')
    expect(recent.has('a')).toBe(false)
    expect(recent.has('b')).toBe(true)
    expect(recent.has('c')).toBe(true)
  })

  it('clear empties the store', () => {
    const recent = createrecentmessageids(4)
    recent.add('a')
    recent.clear()
    expect(recent.has('a')).toBe(false)
  })
})
