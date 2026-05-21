import {
  memoryreadassignedboard,
  memoryreadboardrunner,
  memorywriteassignedboard,
  memorywriteboardrunner,
} from 'zss/memory/session'

describe('session boardrunner worker fields', () => {
  afterEach(() => {
    memorywriteboardrunner('')
    memorywriteassignedboard('')
  })

  it('memorywriteboardrunner / memoryreadboardrunner round-trip', () => {
    memorywriteboardrunner('p1')
    expect(memoryreadboardrunner()).toBe('p1')
  })

  it('memorywriteassignedboard / memoryreadassignedboard round-trip', () => {
    memorywriteassignedboard('board-a')
    expect(memoryreadassignedboard()).toBe('board-a')
  })
})
