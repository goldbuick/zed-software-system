import type { DEVICE } from 'zss/device'
import {
  handleplayergotoboard,
  resolveplayergotodestpt,
} from 'zss/device/vm/handlers/playergotoboard'
import { memorycreatebook } from 'zss/memory/bookoperations'
import { memorycreatecodepage } from 'zss/memory/codepageoperations'
import { memoryresetbooks } from 'zss/memory/session'
import type { BOARD } from 'zss/memory/types'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

const applyplayermovetoboard = jest.fn(() => true)

jest.mock('zss/device/vm/handlers/playermovetoboard', () => ({
  applyplayermovetoboard: (...args: unknown[]) =>
    applyplayermovetoboard(...args),
}))

describe('resolveplayergotodestpt', () => {
  afterEach(() => {
    memoryresetbooks([])
  })

  function setupdestboard(
    board: Partial<BOARD> & { name: string },
  ): string {
    const page = memorycreatecodepage(`@board ${board.name}\n`, {
      board: {
        id: '',
        name: board.name,
        terrain: board.terrain ?? [],
        objects: board.objects ?? {},
        startx: board.startx,
        starty: board.starty,
      },
    })
    const book = memorycreatebook([page])
    book.name = 'main'
    memoryresetbooks([book])
    return page.id
  }

  it('lands on matching passage coords', () => {
    const boardid = setupdestboard({
      name: 'dest',
      startx: 1,
      starty: 1,
      objects: {
        passage1: {
          id: 'passage1',
          name: 'passage',
          x: 3,
          y: 7,
          kind: 'passage',
        },
      },
    })

    const resolved = resolveplayergotodestpt('dest', undefined, undefined, {
      name: 'passage',
      color: [],
    })
    expect(resolved?.boardid).toBe(boardid)
    expect(resolved?.destpt).toEqual({ x: 3, y: 7 })
  })

  it('uses explicit x,y over passage match', () => {
    setupdestboard({
      name: 'dest',
      objects: {
        passage1: {
          id: 'passage1',
          name: 'passage',
          x: 3,
          y: 7,
          kind: 'passage',
        },
      },
    })

    const resolved = resolveplayergotodestpt('dest', 10, 12, {
      name: 'passage',
      color: [],
    })
    expect(resolved?.destpt).toEqual({ x: 10, y: 12 })
  })

  it('falls back to startx/starty on match miss', () => {
    setupdestboard({
      name: 'dest',
      startx: 4,
      starty: 8,
      objects: {},
    })

    const resolved = resolveplayergotodestpt('dest', undefined, undefined, {
      name: 'passage',
      color: [],
    })
    expect(resolved?.destpt).toEqual({ x: 4, y: 8 })
  })

  it('falls back to board center when no start and no match', () => {
    setupdestboard({
      name: 'dest',
      objects: {},
    })

    const resolved = resolveplayergotodestpt(
      'dest',
      undefined,
      undefined,
      undefined,
    )
    expect(resolved?.destpt).toEqual({
      x: Math.round(BOARD_WIDTH * 0.5),
      y: Math.round(BOARD_HEIGHT * 0.5),
    })
  })

  it('returns undefined for missing board', () => {
    memoryresetbooks([])
    expect(
      resolveplayergotodestpt('missing', undefined, undefined, undefined),
    ).toBeUndefined()
  })
})

describe('handleplayergotoboard', () => {
  afterEach(() => {
    memoryresetbooks([])
    applyplayermovetoboard.mockClear()
  })

  it('applies resolved dest via applyplayermovetoboard', () => {
    const page = memorycreatecodepage('@board dest\n', {
      board: {
        id: '',
        name: 'dest',
        terrain: [],
        objects: {
          passage1: {
            id: 'passage1',
            name: 'passage',
            x: 3,
            y: 7,
            kind: 'passage',
          },
        },
        startx: 1,
        starty: 1,
      },
    })
    const book = memorycreatebook([page])
    book.name = 'main'
    memoryresetbooks([book])

    const vm = { emit: jest.fn() } as unknown as DEVICE
    handleplayergotoboard(vm, {
      player: 'runner',
      data: [
        'pid_test',
        'dest',
        undefined,
        undefined,
        { name: 'passage', color: [] },
      ],
    } as never)

    expect(applyplayermovetoboard).toHaveBeenCalledWith(
      vm,
      'runner',
      'pid_test',
      page.id,
      { x: 3, y: 7 },
    )
  })

  it('does not apply when board is missing', () => {
    memoryresetbooks([])
    const vm = { emit: jest.fn() } as unknown as DEVICE
    handleplayergotoboard(vm, {
      player: 'runner',
      data: ['pid_test', 'missing', undefined, undefined, undefined],
    } as never)
    expect(applyplayermovetoboard).not.toHaveBeenCalled()
  })
})
