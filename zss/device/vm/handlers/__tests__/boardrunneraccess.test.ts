import type { DEVICE } from 'zss/device'
import { createmessage } from 'zss/device'
import {
  boardrunneraccessfor,
  boardrunnerassign,
} from 'zss/device/vm/boardrunnermanagement'
import { handleboardrunneraccess } from 'zss/device/vm/handlers/boardrunneraccess'
import { boardrunneraccess, playerrunners } from 'zss/device/vm/state'

describe('handleboardrunneraccess', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    delete playerrunners.p1
    delete boardrunneraccess['board-a']
  })

  it('registers pending board id on elected board for the message player', () => {
    boardrunnerassign('board-a', 'p1')
    const message = createmessage('s', 'p1', 'x', 'boardrunneraccess', 'b99')
    message.target = 'boardrunneraccess'
    handleboardrunneraccess(vm, message)
    expect(boardrunneraccessfor('board-a')).toContain('b99')
  })
})
