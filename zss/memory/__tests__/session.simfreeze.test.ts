import {
  memoryreadsimfreeze,
  memorywritesimfreeze,
} from 'zss/memory/session'

describe('session simfreeze', () => {
  afterEach(() => {
    memorywritesimfreeze(false)
  })

  it('defaults to not frozen', () => {
    memorywritesimfreeze(false)
    expect(memoryreadsimfreeze()).toBe(false)
  })

  it('memorywritesimfreeze toggles memoryreadsimfreeze', () => {
    memorywritesimfreeze(true)
    expect(memoryreadsimfreeze()).toBe(true)
    memorywritesimfreeze(false)
    expect(memoryreadsimfreeze()).toBe(false)
  })
})
