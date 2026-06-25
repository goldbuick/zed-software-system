import { compileast } from 'zss/feature/lang/backend/typescript/ast'
import {
  boardcodedelements,
  elementtozss,
  layoutfromkind,
  resolvestatcode,
} from 'ops/lib/content/zztcorpus'
import { zztencodeboardblob, zztencodeworld } from 'zss/feature/parse/zztencode'
import type { ZZT_BOARD, ZZT_ELEMENT, ZZT_STAT } from 'zss/feature/parse/zztformattypes'
import { zztparseboard, zztparseworld } from 'zss/feature/parse/zztbinparse'

const ZZT_TILE_LION = 41
const ZZT_BOARD_WIDTH = 60
const ZZT_BOARD_HEIGHT = 25
const ZZT_BOARD_SIZE = ZZT_BOARD_WIDTH * ZZT_BOARD_HEIGHT

function blankelements(): ZZT_ELEMENT[] {
  return Array.from({ length: ZZT_BOARD_SIZE }, () => ({ type: 0, color: 0 }))
}

function tileat(elements: ZZT_ELEMENT[], x: number, y: number, tile: ZZT_ELEMENT) {
  elements[x + y * ZZT_BOARD_WIDTH] = tile
}

function minimalboard(name: string, stats: ZZT_STAT[]): ZZT_BOARD {
  return {
    boardname: name,
    elements: blankelements(),
    stats,
    maxplayershots: 255,
    isdark: 0,
    exitnorth: 0,
    exitsouth: 0,
    exitwest: 0,
    exiteast: 0,
    restartonzap: 0,
    messagelength: 0,
    message: '',
    timelimit: 0,
  }
}

describe('zztcorpus', () => {
  it('extracts coded elements and converts OOP to compilable zss', () => {
    const board = minimalboard('Test', [
      {
        x: 5,
        y: 5,
        cycle: 2,
        p1: 14,
        code: ":touch\n#give gem 1\n#end",
      },
    ])
    tileat(board.elements, 5, 5, { type: ZZT_TILE_LION, color: 14 })

    const parsed = zztparseworld(
      zztencodeworld('CORPUS', 0, [board]),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const elements = boardcodedelements(
      parsed.boards[0],
      layoutfromkind('zzt'),
      0,
    )
    expect(elements).toHaveLength(1)
    expect(elements[0].kind).toBe('lion')

    const zss = elementtozss(elements[0])
    expect(zss).toContain('@lion')
    expect(zss).toContain(':touch')
    expect(zss).toContain('#give gem 1')

    const compiled = compileast(zss)
    expect(compiled.errors ?? []).toHaveLength(0)
    expect(compiled.ast).toBeTruthy()
  })

  it('skips bind-only stats and emits source once', () => {
    const board = minimalboard('Bind', [
      {
        x: 5,
        y: 5,
        code: ":source\n#end",
      },
      {
        x: 10,
        y: 10,
        bind: 0,
      },
    ])
    tileat(board.elements, 5, 5, { type: ZZT_TILE_LION, color: 7 })
    tileat(board.elements, 10, 10, { type: ZZT_TILE_LION, color: 7 })

    expect(resolvestatcode(board.stats[1], board.stats)).toBeUndefined()

    const blob = zztencodeboardblob(board)
    const parsed = zztparseboard(blob)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const elements = boardcodedelements(
      parsed.board,
      layoutfromkind(parsed.layout),
      0,
    )
    expect(elements).toHaveLength(1)
    expect(elements[0].statindex).toBe(0)
    expect(elements[0].code).toContain(':source')
  })
})
