import { memoryreadfrozen, memorywritefrozen } from 'zss/memory/session'

describe('session frozen', () => {
  afterEach(() => {
    memorywritefrozen(false)
  })

  it('defaults to not frozen', () => {
    memorywritefrozen(false)
    expect(memoryreadfrozen()).toBe(false)
  })

  it('memorywritefrozen toggles memoryreadfrozen', () => {
    memorywritefrozen(true)
    expect(memoryreadfrozen()).toBe(true)
    memorywritefrozen(false)
    expect(memoryreadfrozen()).toBe(false)
  })
})
