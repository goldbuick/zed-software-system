import { RUNTIME } from 'zss/config'
import {
  defaultcapturemedia,
  rasterizelayerstorgba,
} from 'zss/gadget/capture/rasterize'
import { zztencodeworld } from 'zss/feature/parse/zztencode'
import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import { zztparseworld } from 'zss/feature/parse/zztbinparse'
import type { ZZT_BOARD } from 'zss/feature/parse/zztformattypes'
import { memoryreadboardbyaddress } from 'zss/memory/boards'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import { memoryclearbook, memoryresetbooks, memorywritebook } from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

jest.mock('zss/config', () => ({
  LANG_DEV: false,
  LANG_TYPES: false,
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

function walledboard(name: string): ZZT_BOARD {
  const elements = blankelements()
  const solid = { type: 21, color: 1 }
  for (let x = 0; x < BOARD_WIDTH; ++x) {
    elements[x] = solid
    elements[(BOARD_HEIGHT - 1) * BOARD_WIDTH + x] = solid
  }
  for (let y = 0; y < BOARD_HEIGHT; ++y) {
    elements[y * BOARD_WIDTH] = solid
    elements[y * BOARD_WIDTH + BOARD_WIDTH - 1] = solid
  }
  return {
    boardname: name,
    elements,
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

describe('rasterizelayerstorgba', () => {
  it('renders a walled imported ZZT board at 960x700', () => {
    memoryresetbooks([])
    const board = walledboard('Title')
    const bytes = zztencodeworld('MYWORLD', 0, [board])
    const parsed = zztparseworld(bytes)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    loadcoolregionsbowelementlibrary()
    const { book, boardaddresses } = importzztboardstobook(parsed.boards, {
      tilewidth: BOARD_WIDTH,
      tileheight: BOARD_HEIGHT,
      croppedfromszzt: false,
    })
    memorywritebook(book)
    try {
      const memboard = memoryreadboardbyaddress(boardaddresses[0])
      expect(memboard).toBeDefined()
      if (!memboard) {
        return
      }

      const gadgetlayers = memoryreadgadgetlayers('flat', memboard)
      const media = defaultcapturemedia()
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

      let nonzero = 0
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] || rgba[i + 1] || rgba[i + 2]) {
          nonzero += 1
        }
      }
      expect(nonzero).toBeGreaterThan(1000)
    } finally {
      memoryclearbook(book.id)
    }
  })
})
