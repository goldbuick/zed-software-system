import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { createmessage } from 'zss/device'
import { handleboardrunneraccess } from 'zss/device/vm/handlers/boardrunneraccess'
import {
  boardrunneraccessfor,
  boardrunnerassign,
} from 'zss/device/vm/boardrunnermanagement'
import { boardrunneraccess, playerrunners } from 'zss/device/vm/state'

describe('handleboardrunneraccess', () => {
  const vm = {} as DEVICE

  beforeEach(() => {
    delete playerrunners['p1']
    delete boardrunneraccess['board-a']
  })

  it('registers pending board id on elected board for the message player', () => {
    boardrunnerassign('board-a', 'p1')
    const message = createmessage('s', 'p1', 'x', 'boardrunneraccess', 'b99')
    message.target = 'boardrunneraccess'
    handleboardrunneraccess(vm, message as MESSAGE)
    expect(boardrunneraccessfor('board-a')).toContain('b99')
  })
})
