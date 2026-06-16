import { memoryreadfrozen, memorywritefrozen } from 'zss/memory/session'

describe('session simfreeze', () => {
  afterEach(() => {
    memorywritefrozen(false)
  })

  it('defaults to not frozen', () => {
    memorywritefrozen(false)
    expect(memoryreadfrozen()).toBe(false)
  })

  it('memorywritesimfreeze toggles memoryreadsimfreeze', () => {
    memorywritefrozen(true)
    expect(memoryreadfrozen()).toBe(true)
    memorywritefrozen(false)
    expect(memoryreadfrozen()).toBe(false)
  })
})
