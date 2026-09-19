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

describe('player party touch remap', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  function setupplayers() {
    mockedmemorychipispresent.mockReturnValue(true)
    mockedmemorymessagechip.mockClear()
    memoryresetbooks([
      memorycreatebook([
        memorycreatecodepage('@player\n', {}),
        memorycreatecodepage('@object\n', {}),
      ]),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
    const from = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 1 },
      'player',
      'pid_from',
    )
    const to = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'player',
      'pid_to',
    )
    expect(from).toBeDefined()
    expect(to).toBeDefined()
    from!.kind = 'player'
    to!.kind = 'player'
    READ_CONTEXT.board = board
    return { from: from!, to: to! }
  }

  it('sends partytouch when players share a party id', () => {
    const { from, to } = setupplayers()
    from.party = 'pid_team'
    to.party = 'pid_team'
    memorysendtoelement(from, to, 'touch')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'pid_to:partytouch',
      }),
    )
  })

  it('sends partytouch when both sides are player-affiliated', () => {
    const { from, to } = setupplayers()
    from.party = 'pid_from'
    to.party = 'pid_to'
    memorysendtoelement(from, to, 'touch')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'pid_to:partytouch',
      }),
    )
  })

  it('keeps touch for object kind even when party matches', () => {
    mockedmemorychipispresent.mockReturnValue(true)
    mockedmemorymessagechip.mockClear()
    memoryresetbooks([
      memorycreatebook([
        memorycreatecodepage('@player\n', {}),
        memorycreatecodepage('@object\n', {}),
      ]),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
    const from = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 1 },
      'player',
      'pid_from',
    )
    const to = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'object',
      'sid_obj',
    )
    expect(from).toBeDefined()
    expect(to).toBeDefined()
    from!.kind = 'player'
    to!.kind = 'object'
    from!.party = 'pid_team'
    to!.party = 'pid_team'
    READ_CONTEXT.board = board
    memorysendtoelement(from!, to!, 'touch')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'sid_obj:touch',
      }),
    )
  })
})
