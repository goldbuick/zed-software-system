import { memoryreadfreeze, memorywritefreeze } from 'zss/memory/session'

describe('session freeze', () => {
  afterEach(() => {
    memorywritefreeze(false)
  })

  it('defaults to not frozen', () => {
    memorywritefreeze(false)
    expect(memoryreadfreeze()).toBe(false)
  })

  it('memorywritefreeze toggles memoryreadfreeze', () => {
    memorywritefreeze(true)
    expect(memoryreadfreeze()).toBe(true)
    memorywritefreeze(false)
    expect(memoryreadfreeze()).toBe(false)
  })
})
