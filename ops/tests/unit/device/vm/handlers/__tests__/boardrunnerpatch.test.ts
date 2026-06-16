import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { handleboardrunnerpatch } from 'zss/device/vm/handlers/boardrunnerpatch'
import { encodepatchwire } from 'zss/feature/jsonpipe/wire'
import {
  memoryboundariesclear,
  memoryboundaryalloc,
  memoryboundaryget,
} from 'zss/memory/boundaries'

describe('handleboardrunnerpatch', () => {
  beforeEach(() => {
    memoryboundariesclear()
  })

  it('applies patch to boundary doc on sim VM', () => {
    const bid = 'test-boundary'
    memoryboundaryalloc({ x: 1 }, bid)
    const patch = encodepatchwire([
      { op: 'replace' as const, path: '/x', value: 2 },
    ])
    const vm = { emit: jest.fn() } as unknown as DEVICE
    const message = {
      player: 'player-a',
      data: [patch, bid],
    } as MESSAGE

    handleboardrunnerpatch(vm, message)

    expect(memoryboundaryget(bid)).toEqual({ x: 2 })
  })
})
