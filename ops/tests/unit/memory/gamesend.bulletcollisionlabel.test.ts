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
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import {
  memorybulletcollisionlabel,
  memorysendtoelement,
} from 'zss/memory/gamesend'
import { memoryresetbooks } from 'zss/memory/session'
import type { BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

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
        id: 'sid_head',
        kind: 'head',
        breakable: 1,
      }),
    ).toBe('shot')
  })

  it('uses partyshot for object-party bullet vs lion', () => {
    expect(
      memorybulletcollisionlabel(bullet('sid_object'), {
        id: 'sid_lion',
        kind: 'lion',
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

  it('softdeletes @isbreakable targets on shot including head', () => {
    const board = setupkinds(
      '@terrain breakable\n@isbreakable\n',
      '@head\n@isbreakable\n',
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
    const head = memorycreateboardobjectfromkind(
      board,
      { x: 3, y: 1 },
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
    expect(head).toBeDefined()
    head!.kind = 'head'
    head!.breakable = 1
    const headlabel = memorybulletcollisionlabel(shot!, head!)
    expect(headlabel).toBe('shot')
    memorysendtoelement(shot!, head!, headlabel)
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'sid_head:shot' }),
    )
    expect(mockedmemorysafedeleteelement).toHaveBeenCalled()
  })
})
