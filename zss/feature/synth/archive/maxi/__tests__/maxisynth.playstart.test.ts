import {
  invokeplay,
  parseplay,
  tonenotationseconds,
} from 'zss/feature/synth/playnotation'

import { playpatternendtime, resolveplaystarttime } from '../../../backend/wasm/playstart'

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

describe('playpatternendtime', () => {
  it('uses last pattern entry time, not note duration sum', () => {
    const invoke = parseplay('c')[0]
    const pattern = invokeplay(0, 0, invoke, true)
    const end = playpatternendtime(pattern, 0)
    const lasttime = pattern[pattern.length - 1]?.[0] ?? 0
    expect(end).toBe(lasttime)
    expect(end).toBeLessThan(lasttime + tonenotationseconds('8n'))
  })
})
