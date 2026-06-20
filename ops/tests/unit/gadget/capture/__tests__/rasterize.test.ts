import { RUNTIME } from 'zss/config'
import {
  rasterizelayerstorgba,
} from 'zss/gadget/capture/rasterize'
import { createbitmap } from 'zss/gadget/data/bitmap'
import type { PALETTE_RGB } from 'zss/gadget/data/palette'
import { zztencodeworld } from 'zss/feature/parse/zztencode'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import { zztparseworld } from 'zss/feature/parse/zztbinparse'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { memorylistcodepagebytype } from 'zss/memory/bookoperations'
import { memoryreadcodepagedata } from 'zss/memory/codepageoperations'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import { memoryclearbook, memoryresetbooks, memorywritebook } from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH, CODE_PAGE_TYPE } from 'zss/memory/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
}))

function blankelements(): { type: number; color: number }[] {
  return Array.from({ length: 1500 }, () => ({ type: 0, color: 0 }))
}

function minimalboard(name: string): ZZT_BOARD {
  return {
    boardname: name,
    elements: blankelements(),
    stats: [{ x: 0, y: 0, code: '' }],
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

function testmedia() {
  const charset = createbitmap(128, 224)
  const palette: PALETTE_RGB[] = Array.from({ length: 16 }, (_, i) => ({
    r: i / 15,
    g: i / 15,
    b: i / 15,
  }))
  return { charset, palette }
}

describe('rasterizelayerstorgba', () => {
  it('renders a minimal imported ZZT board at 960x700', () => {
    memoryresetbooks([])
    const board = minimalboard('Title')
    const bytes = zztencodeworld('MYWORLD', 0, [board])
    const parsed = zztparseworld(bytes)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const { book, boardaddresses } = importzztboardstobook(parsed.boards, {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)
    try {
      const boardpages = memorylistcodepagebytype(book, CODE_PAGE_TYPE.BOARD)
      expect(boardpages.length).toBeGreaterThan(0)
      const memboard = memoryreadcodepagedata<CODE_PAGE_TYPE.BOARD>(boardpages[0])
      expect(memboard).toBeDefined()
      if (!memboard) {
        return
      }

      const gadgetlayers = memoryreadgadgetlayers('flat', memboard)
      const media = testmedia()
      const { width, height, rgba } = rasterizelayerstorgba(
        gadgetlayers.layers,
        media.charset,
        media.palette,
      )

      const cellw = RUNTIME.DRAW_CHAR_WIDTH()
      const cellh = RUNTIME.DRAW_CHAR_HEIGHT()
      expect(width).toBe(BOARD_WIDTH * cellw)
      expect(height).toBe(BOARD_HEIGHT * cellh)
      expect(width).toBe(960)
      expect(height).toBe(700)
      expect(rgba.length).toBe(width * height * 4)
      expect(rgba[3]).toBe(255)
    } finally {
      memoryclearbook(book.id)
    }
  })
})
