jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    YIELD_STRIKE_LIMIT: 32,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  DEBUG_SHOW_CODE: false,
  TRACE_CODE: '',
  DEBUG_LOG: false,
}))

const mockedchipmessage = jest.fn()
jest.mock('zss/device/api', () => ({
  chipmessage: (...args: unknown[]) => mockedchipmessage(...args),
  synthplay: jest.fn(),
}))

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

import { SOFTWARE } from 'zss/device/session'
import { memorysendtoelement } from 'zss/memory/gamesend'
import type { BOARD, BOARD_ELEMENT } from 'zss/memory/types'
import { READ_CONTEXT } from 'zss/words/reader'

describe('memorysendtoelement chip delivery', () => {
  const gate: BOARD_ELEMENT = {
    id: 'obj_gate',
    x: 5,
    y: 5,
    kind: 'gate',
    name: 'gate',
  }
  const player: BOARD_ELEMENT = {
    id: 'pid_testplayer',
    x: 4,
    y: 5,
    kind: 'player',
  }
  const board = {
    id: 'board_test',
    terrain: [],
    objects: {
      [gate.id!]: gate,
      [player.id!]: player,
    },
  } as BOARD

  beforeEach(() => {
    mockedchipmessage.mockClear()
    mockedmemorymessagechip.mockClear()
    mockedmemorychipispresent.mockReset()
    READ_CONTEXT.board = board
    READ_CONTEXT.element = player
    READ_CONTEXT.elementid = player.id!
    READ_CONTEXT.elementfocus = player.id!
    READ_CONTEXT.timestamp = 1
  })

  it('emits chip: when local chip is absent (CLI / sim path)', () => {
    mockedmemorychipispresent.mockReturnValue(false)
    memorysendtoelement(player, gate, 'open')
    expect(mockedchipmessage).toHaveBeenCalledWith(
      SOFTWARE,
      player.id,
      'obj_gate',
      'open',
      [],
    )
    expect(mockedmemorymessagechip).not.toHaveBeenCalled()
  })

  it('uses local memorymessagechip when chip is present', () => {
    mockedmemorychipispresent.mockReturnValue(true)
    memorysendtoelement(player, gate, 'open')
    expect(mockedchipmessage).not.toHaveBeenCalled()
    expect(mockedmemorymessagechip).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'obj_gate:open',
        sender: player.id,
        player: player.id,
      }),
    )
  })
})
