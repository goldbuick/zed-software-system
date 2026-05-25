import { resolveplaystarttime } from '../playstart'

describe('wasm play start time', () => {
  it('starts at now when pacer is unset', () => {
    expect(resolveplaystarttime(-1, 10)).toBe(10)
  })

  it('restarts at now when pacer is in the past', () => {
    expect(resolveplaystarttime(5, 10)).toBe(10)
  })

  it('queues after pacer when pacer is still in the future', () => {
    expect(resolveplaystarttime(12, 10)).toBe(12)
  })
})
