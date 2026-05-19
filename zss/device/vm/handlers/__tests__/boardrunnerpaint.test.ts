import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  memoryboundariesclear,
  memoryboundaryget,
} from 'zss/memory/boundaries'

import { handleboardrunnerpaint } from '../boardrunnerpaint'

describe('handleboardrunnerpaint', () => {
  beforeEach(() => {
    memoryboundariesclear()
  })

  it('writes boundary memory', () => {
    const bid = 'paint-test-boundary'
    const doc = { layer: 1, tiles: [] }
    const vm = {} as DEVICE
    const message = {
      player: 'runner-a',
      data: [doc, bid],
    } as MESSAGE

    handleboardrunnerpaint(vm, message)

    expect(memoryboundaryget(bid)).toEqual(doc)
  })

  it('ignores non-array data', () => {
    const vm = {} as DEVICE
    const message = { player: 'p', data: 'bad' } as MESSAGE
    handleboardrunnerpaint(vm, message)
    expect(memoryboundaryget('paint-test-boundary')).toBeUndefined()
  })

  it('ignores empty boundary id', () => {
    const vm = {} as DEVICE
    const message = { player: 'p', data: [{}, ''] } as MESSAGE
    handleboardrunnerpaint(vm, message)
    expect(memoryboundaryget('')).toBeUndefined()
  })
})
