import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import * as api from 'zss/device/api'
import {
  memoryboundariesclear,
  memoryboundaryalloc,
  memoryboundaryget,
} from 'zss/memory/boundaries'

import { handleboardrunnerpatch } from '../boardrunnerpatch'

describe('handleboardrunnerpatch', () => {
  beforeEach(() => {
    memoryboundariesclear()
  })

  it('applies patch to boundary doc on sim VM', () => {
    const bid = 'test-boundary'
    memoryboundaryalloc({ x: 1 }, bid)
    const patch = [{ op: 'replace' as const, path: '/x', value: 2 }]
    const vm = { emit: jest.fn() } as unknown as DEVICE
    const message = {
      player: 'player-a',
      data: [patch, bid],
    } as MESSAGE

    handleboardrunnerpatch(vm, message)

    expect(memoryboundaryget(bid)).toEqual({ x: 2 })
  })

  it('calls boardrunnerpaint when apply fails for boundary patch', () => {
    const bid = 'b-desync'
    memoryboundaryalloc({}, bid)
    const paint = jest
      .spyOn(api, 'boardrunnerpaint')
      .mockImplementation(jest.fn())
    const patch = [{ op: 'replace' as const, path: '/missing/a/b', value: 1 }]
    const vm = { emit: jest.fn() } as unknown as DEVICE
    const message = {
      player: 'p',
      data: [patch, bid],
    } as MESSAGE

    handleboardrunnerpatch(vm, message)

    expect(paint).toHaveBeenCalledWith(vm, 'p', {}, bid)

    paint.mockRestore()
  })
})
