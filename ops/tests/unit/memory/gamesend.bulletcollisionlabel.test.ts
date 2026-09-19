const mockedmemorychipispresent = jest.fn()
const mockedmemorymessagechip = jest.fn()
const mockedmemorysafedeleteelement = jest.fn()
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
jest.mock('zss/memory/boardlifecycle', () => {
  const actual = jest.requireActual('zss/memory/boardlifecycle') as Record<
    string,
    unknown
  >
  return {
    ...actual,
    memorysafedeleteelement: (...args: unknown[]) =>
      mockedmemorysafedeleteelement(...args),
  }
})

import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorymoveobject } from 'zss/memory/boardmovement'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memorysendtoelement } from 'zss/memory/gamesend'
import { memoryresetbooks } from 'zss/memory/session'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION } from 'zss/words/types'

describe('shot / partyshot remap via playerpartyinteraction', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  function setupkinds(...codes: string[]) {
    mockedmemorychipispresent.mockReturnValue(true)
    mockedmemorymessagechip.mockClear()
    mockedmemorysafedeleteelement.mockClear()
    memoryresetbooks([
      memorycreatebook(codes.map((code) => memorycreatecodepage(code, {}))),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
    READ_CONTEXT.board = board
    READ_CONTEXT.timestamp = 1
    return board
  }

  it('remaps shot to partyshot when both sides are non-player-affiliated', () => {
    const board = setupkinds('@lion\n', '@bullet\n')
    const lion = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'lion',
      'sid_lion',
    )
    const shot = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bullet',
      'sid_shot',
    )
    expect(lion).toBeDefined()
    expect(shot).toBeDefined()
    shot!.party = 'sid_object'
    memorysendtoelement(shot!, lion!, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_lion:partyshot' }),
    )
    expect(mockedmemorysafedeleteelement).not.toHaveBeenCalled()
  })

  it('keeps shot for player-party bullet vs lion', () => {
    const board = setupkinds('@lion\n', '@bullet\n')
    const lion = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'lion',
      'sid_lion',
    )
    const shot = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bullet',
      'sid_shot',
    )
    shot!.party = 'pid_hero'
    memorysendtoelement(shot!, lion!, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_lion:shot' }),
    )
  })

  it('keeps shot for object-party bullet vs object kind', () => {
    const board = setupkinds('@object\n', '@bullet\n')
    const other = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'object',
      'sid_other',
    )
    const shot = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bullet',
      'sid_shot',
    )
    shot!.party = 'sid_object'
    other!.kind = 'object'
    memorysendtoelement(shot!, other!, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_other:shot' }),
    )
  })

  it('keeps shot for object-party bullet vs player', () => {
    const board = setupkinds('@player\n', '@bullet\n')
    const player = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'player',
      'pid_target',
    )
    const shot = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bullet',
      'sid_shot',
    )
    shot!.party = 'sid_object'
    player!.kind = 'player'
    memorysendtoelement(shot!, player!, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'pid_target:shot' }),
    )
  })

  it('softdeletes @isbreakable on real shot; remaps head to partyshot', () => {
    const board = setupkinds(
      '@terrain breakable\n@isbreakable\n',
      '@object gem\n@isbreakable\n',
      '@head\n',
      '@bullet\n',
    )
    const wall = memorycreateboardobjectfromkind(
      board,
      { x: 1, y: 1 },
      'breakable',
      'sid_wall',
    )
    if (wall) {
      wall.kind = 'breakable'
      wall.breakable = 1
    }
    const gem = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 1 },
      'gem',
      'sid_gem',
    )
    if (gem) {
      gem.breakable = 1
    }
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 4, y: 1 },
      'head',
      'sid_head',
    )
    const shot = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 2 },
      'bullet',
      'sid_shot',
    )
    expect(shot).toBeDefined()
    shot!.party = 'pid_hero'

    if (wall) {
      memorysendtoelement(shot!, wall, 'shot')
      expect(mockedmemorysafedeleteelement).toHaveBeenCalled()
    }

    mockedmemorysafedeleteelement.mockClear()
    expect(gem).toBeDefined()
    memorysendtoelement(shot!, gem!, 'shot')
    expect(mockedmemorysafedeleteelement).toHaveBeenCalled()

    mockedmemorysafedeleteelement.mockClear()
    mockedmemorymessagechip.mockClear()
    expect(head).toBeDefined()
    head!.kind = 'head'
    shot!.party = 'sid_object'
    memorysendtoelement(shot!, head!, 'shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_head:partyshot' }),
    )
    expect(mockedmemorysafedeleteelement).not.toHaveBeenCalled()
  })
})

describe('walker into bullet uses one-way touch', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  function setupkinds(...codes: string[]) {
    mockedmemorychipispresent.mockReturnValue(true)
    mockedmemorymessagechip.mockClear()
    mockedmemorysafedeleteelement.mockClear()
    memoryresetbooks([
      memorycreatebook(codes.map((code) => memorycreatecodepage(code, {}))),
    ])
    const board = memorycreateboard()
    memoryensureboardready(board)
    READ_CONTEXT.board = board
    READ_CONTEXT.timestamp = 1
    return board
  }

  function placewalkerandbullet(
    board: ReturnType<typeof memorycreateboard>,
    party: string,
  ) {
    const tiger = memorycreateboardobjectfromkind(
      board,
      { x: 2, y: 1 },
      'tiger',
      'sid_tiger_b',
    )
    const shot = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 1 },
      'bullet',
      'sid_shot',
    )
    expect(tiger).toBeDefined()
    expect(shot).toBeDefined()
    shot!.party = party
    shot!.collision = COLLISION.ISBULLET
    shot!.breakable = 1
    return { tiger: tiger!, shot: shot! }
  }

  it('one-way touch to enemy-party bullet without softdelete', () => {
    const board = setupkinds('@tiger\n', '@bullet\n@isbullet\n@isbreakable\n')
    const { tiger, shot } = placewalkerandbullet(board, 'sid_tiger_a')
    const moved = memorymoveobject(undefined, board, tiger, { x: 3, y: 1 })
    expect(moved).toBe(false)
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_shot:partytouch' }),
    )
    expect(mockedmemorysafedeleteelement).not.toHaveBeenCalled()
    expect(shot.removed).toBeUndefined()
  })

  it('one-way touch to player-party bullet without softdelete', () => {
    const board = setupkinds('@tiger\n', '@bullet\n@isbullet\n@isbreakable\n')
    const { tiger, shot } = placewalkerandbullet(board, 'pid_hero')
    const moved = memorymoveobject(undefined, board, tiger, { x: 3, y: 1 })
    expect(moved).toBe(false)
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_shot:touch' }),
    )
    expect(mockedmemorysafedeleteelement).not.toHaveBeenCalled()
    expect(shot.removed).toBeUndefined()
  })
})
