import type { DEVICE } from 'zss/device'
import { createmessage } from 'zss/device'
import { boardrunneraccessfor } from 'zss/device/vm/boardrunnermanagement'
import { handleboardrunneraccess } from 'zss/device/vm/handlers/boardrunneraccess'
import { boardrunneraccess } from 'zss/device/vm/state'
import * as boards from 'zss/memory/boards'
import type { BOARD } from 'zss/memory/types'

jest.mock('zss/memory/boards', () => ({
  memoryreadboardbyaddress: jest.fn(),
}))

function stubboard(id: string): BOARD {
  return { id, name: id, terrain: [], objects: {} }
}

describe('handleboardrunneraccess', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    delete boardrunneraccess['board-a']
    jest.mocked(boards.memoryreadboardbyaddress).mockImplementation((id) => {
      if (id === 'board-a' || id === 'b99') {
        return stubboard(id)
      }
      return undefined
    })
  })

  it('tracks access from current board to neighbor board', () => {
    const message = createmessage('s', 'p1', 'x', 'boardrunneraccess', [
      'board-a',
      'b99',
    ])
    message.target = 'boardrunneraccess'
    handleboardrunneraccess(vm, message)
    expect(boardrunneraccessfor('board-a')).toContain('b99')
  })
})
