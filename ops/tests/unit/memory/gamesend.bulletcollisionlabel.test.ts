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

import { memoryboundariesclear } from 'zss/memory/boundaries'
import {
  memorycreateboard,
  memorycreateboardobjectfromkind,
} from 'zss/memory/boardlifecycle'
import { memoryensureboardready } from 'zss/memory/boardlookup'
import { memorymoveobject } from 'zss/memory/boardmovement'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memorybulletcollisionlabel,
  memorysendtoelement,
} from 'zss/memory/gamesend'
import { memoryresetbooks } from 'zss/memory/session'
import type { BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'
import { COLLISION } from 'zss/words/types'

describe('memorybulletcollisionlabel', () => {
  function bullet(party: string): BOARD_ELEMENT {
    return { id: 'sid_bullet', kind: 'bullet', party }
  }

  it('uses shot when target is a player', () => {
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        id: 'pid_hero',
        kind: 'player',
      }),
    ).toBe('shot')
  })

  it('uses shot when bullet party is a player id', () => {
    expect(
      memorybulletcollisionlabel(bullet('pid_hero'), {
        id: 'sid_lion',
        kind: 'lion',
      }),
    ).toBe('shot')
  })

  it('uses shot when target kind is object or scroll', () => {
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        id: 'sid_other',
        kind: 'object',
      }),
    ).toBe('shot')
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        id: 'sid_scroll',
        kind: 'scroll',
      }),
    ).toBe('shot')
  })

  it('uses shot when target has @isbreakable', () => {
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        kind: 'breakable',
        breakable: 1,
      }),
    ).toBe('shot')
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        id: 'sid_gem',
        kind: 'gem',
        breakable: 1,
      }),
    ).toBe('shot')
  })

  it('uses partyshot for object-party bullet vs lion or head', () => {
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        id: 'sid_lion',
        kind: 'lion',
      }),
    ).toBe('partyshot')
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        id: 'sid_head',
        kind: 'head',
      }),
    ).toBe('partyshot')
  })

  it('uses partyshot for tiger-party bullet vs lion', () => {
    expect(
      memorybulletcollisionlabel(bullet('sid_tiger'), {
        id: 'sid_lion',
        kind: 'lion',
      }),
    ).toBe('partyshot')
  })
})

describe('enemy-source bullet send labels', () => {
  afterEach(() => {
    memoryboundariesclear()
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

  it('sends partyshot for object-party bullet vs lion without softdelete', () => {
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
    const label = memorybulletcollisionlabel(shot!, lion!)
    memorysendtoelement(shot!, lion!, label)
    expect(label).toBe('partyshot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_lion:partyshot' }),
    )
    expect(mockedmemorysafedeleteelement).not.toHaveBeenCalled()
  })

  it('sends shot for player-party bullet vs lion', () => {
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
    const label = memorybulletcollisionlabel(shot!, lion!)
    memorysendtoelement(shot!, lion!, label)
    expect(label).toBe('shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_lion:shot' }),
    )
  })

  it('sends shot for object-party bullet vs other object', () => {
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
    const label = memorybulletcollisionlabel(shot!, other!)
    memorysendtoelement(shot!, other!, label)
    expect(label).toBe('shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_other:shot' }),
    )
  })

  it('sends shot for object-party bullet vs player', () => {
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
    const label = memorybulletcollisionlabel(shot!, player!)
    memorysendtoelement(shot!, player!, label)
    expect(label).toBe('shot')
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'pid_target:shot' }),
    )
  })

  it('softdeletes @isbreakable wall or gem on shot; head gets partyshot', () => {
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
    shot!.party = 'sid_object'

    if (wall) {
      const walllabel = memorybulletcollisionlabel(shot!, wall)
      expect(walllabel).toBe('shot')
      memorysendtoelement(shot!, wall, walllabel)
      expect(mockedmemorysafedeleteelement).toHaveBeenCalled()
    }

    mockedmemorysafedeleteelement.mockClear()
    expect(gem).toBeDefined()
    const gemlabel = memorybulletcollisionlabel(shot!, gem!)
    expect(gemlabel).toBe('shot')
    memorysendtoelement(shot!, gem!, gemlabel)
    expect(mockedmemorysafedeleteelement).toHaveBeenCalled()

    mockedmemorysafedeleteelement.mockClear()
    mockedmemorymessagechip.mockClear()
    expect(head).toBeDefined()
    head!.kind = 'head'
    const headlabel = memorybulletcollisionlabel(shot!, head!)
    expect(headlabel).toBe('partyshot')
    memorysendtoelement(shot!, head!, headlabel)
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_head:partyshot' }),
    )
    expect(mockedmemorysafedeleteelement).not.toHaveBeenCalled()
  })
})

describe('walker into bullet uses memorybulletcollisionlabel', () => {
  afterEach(() => {
    memoryboundariesclear()
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

  it('sends partyshot and softdeletes breakable enemy-party bullet', () => {
    const board = setupkinds('@tiger\n', '@bullet\n@isbullet\n@isbreakable\n')
    const { tiger, shot } = placewalkerandbullet(board, 'sid_tiger_a')
    const moved = memorymoveobject(undefined, board, tiger, { x: 3, y: 1 })
    expect(moved).toBe(false)
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_tiger_b:partyshot' }),
    )
    expect(mockedmemorysafedeleteelement).toHaveBeenCalledWith(
      board,
      shot,
      1,
    )
    expect(mockedmemorysafedeleteelement).not.toHaveBeenCalledWith(
      board,
      tiger,
      expect.anything(),
    )
  })

  it('sends shot when walker hits player-party bullet', () => {
    const board = setupkinds('@tiger\n', '@bullet\n@isbullet\n@isbreakable\n')
    const { tiger, shot } = placewalkerandbullet(board, 'pid_hero')
    const moved = memorymoveobject(undefined, board, tiger, { x: 3, y: 1 })
    expect(moved).toBe(false)
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_tiger_b:shot' }),
    )
    expect(mockedmemorysafedeleteelement).toHaveBeenCalledWith(
      board,
      shot,
      1,
    )
  })
})
