import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerboundarypipeforget } from 'zss/device/vm/boardrunnerboundarysync'
import {
  memoryboundariesclear,
  memoryboundaryget,
} from 'zss/memory/boundaries'

import { handleboardrunnerpaint } from '../boardrunnerpaint'

jest.mock('zss/device/vm/boardrunnerboundarysync', () => {
  const actual = jest.requireActual<
    typeof import('zss/device/vm/boardrunnerboundarysync')
  >('zss/device/vm/boardrunnerboundarysync')
  return {
    ...actual,
    boardrunnerboundarypipeforget: jest.fn(
      actual.boardrunnerboundarypipeforget,
    ),
  }
})

describe('handleboardrunnerpaint', () => {
  beforeEach(() => {
    memoryboundariesclear()
    jest.mocked(boardrunnerboundarypipeforget).mockClear()
  })

  it('writes boundary memory and forgets sim jsonpipe for that id', () => {
    const bid = 'paint-test-boundary'
    const doc = { layer: 1, tiles: [] }
    const vm = {} as DEVICE
    const message = {
      player: 'runner-a',
      data: [doc, bid],
    } as MESSAGE

    handleboardrunnerpaint(vm, message)

    expect(memoryboundaryget(bid)).toEqual(doc)
    expect(boardrunnerboundarypipeforget).toHaveBeenCalledWith(bid)
  })

  it('ignores non-array data', () => {
    const vm = {} as DEVICE
    const message = { player: 'p', data: 'bad' } as MESSAGE
    handleboardrunnerpaint(vm, message)
    expect(boardrunnerboundarypipeforget).not.toHaveBeenCalled()
  })

  it('ignores empty boundary id', () => {
    const vm = {} as DEVICE
    const message = { player: 'p', data: [{}, ''] } as MESSAGE
    handleboardrunnerpaint(vm, message)
    expect(boardrunnerboundarypipeforget).not.toHaveBeenCalled()
  })
})
