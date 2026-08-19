const mockedmemorychipispresent = jest.fn()
const mockedmemorymessagechip = jest.fn()
jest.mock('zss/memory/runtime', () => {
  const actual = jest.requireActual('zss/memory/runtime') as Record<
    string,
    unknown
  >
  return {
    ...actual,
    memorychipispresent: (...args: unknown[]) =>
      mockedmemorychipispresent(...args),
    memorymessagechip: (...args: unknown[]) =>
      mockedmemorymessagechip(...args),
  }
})

import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memorysendtoelement } from 'zss/memory/gamesend'
import { memoryresetbooks } from 'zss/memory/session'
import { READ_CONTEXT } from 'zss/words/reader'

describe('player party shot remap', () => {
  afterEach(() => {
    memoryboundariesclear()
    memoryresetbooks([])
  })

  function setup() {
    mockedmemorychipispresent.mockReturnValue(true)
    mockedmemorymessagechip.mockClear()
    memoryresetbooks([
      memorycreatebook([
        memorycreatecodepage('@player\n', {}),
        memorycreatecodepage('@bullet\n', {}),
      ]),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
    const target = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'player',
      'pid_target',
    )
    const bullet = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bullet',
      'sid_shot',
    )
    expect(target).toBeDefined()
    expect(bullet).toBeDefined()
    target!.kind = 'player'
    bullet!.party = 'pid_shooter'
    READ_CONTEXT.board = board
    return { target: target!, bullet: bullet! }
  }

  it('sends partyshot when a player-party bullet hits a different player', () => {
    const { target, bullet } = setup()
    memorysendtoelement(bullet, target, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'pid_target:partyshot',
      }),
    )
  })

  it('sends shot when a creature-party bullet hits a player', () => {
    const { target, bullet } = setup()
    bullet.party = 'sid_lion'
    memorysendtoelement(bullet, target, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'pid_target:shot',
      }),
    )
  })

  it('sends partyshot when target shares the bullet party id', () => {
    const { target, bullet } = setup()
    target.party = 'pid_shooter'
    memorysendtoelement(bullet, target, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'pid_target:partyshot',
      }),
    )
  })
})
