import { mapfiletype } from 'zss/feature/parse/file'
import {
  IMAGE_IMPORT_MAX_COLS,
  IMAGE_IMPORT_MAX_ROWS,
  buildpalettehelpers,
  cellcolsrows,
  imageimportwithincap,
  pickcellglyph,
} from 'zss/feature/parse/image'
import { importscreentopatchwork } from 'zss/feature/parse/patchworkimport'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import { memorywriteterrain } from 'zss/memory/boardlifecycle'
import { memorywritecodepage } from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryreadcodepagedata,
} from 'zss/memory/codepageoperations'
import { memoryreadfirstcontentbook } from 'zss/memory/session'
import { BOARD_WIDTH } from 'zss/memory/types'

jest.mock('zss/device/api', () => ({
  apitoast: jest.fn(),
  apierror: jest.fn(),
  vmreadimageimport: jest.fn(),
}))

jest.mock('zss/memory/session', () => ({
  memoryreadfirstcontentbook: jest.fn(),
}))

jest.mock('zss/memory/bookoperations', () => ({
  memorywritecodepage: jest.fn(),
}))

jest.mock('zss/memory/codepageoperations', () => ({
  memorycreatecodepage: jest.fn(),
  memoryreadcodepagedata: jest.fn(),
}))

jest.mock('zss/memory/boardlifecycle', () => ({
  memorywriteterrain: jest.fn(),
}))

function makecolorlist() {
  return buildpalettehelpers()
}

function fillrect(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
) {
  for (let y = y0; y < y0 + h; ++y) {
    for (let x = x0; x < x0 + w; ++x) {
      const i = (x + y * width) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
}

describe('mapfiletype image routing', () => {
  it('maps image/png to png', () => {
    const file = new File([], 'image.png', { type: 'image/png' })
    expect(mapfiletype('image/png', file)).toBe('png')
  })

  it('maps octet-stream with .png extension to png', () => {
    const file = new File([], 'photo.png', { type: 'application/octet-stream' })
    expect(mapfiletype('application/octet-stream', file)).toBe('png')
  })
})

describe('cellcolsrows', () => {
  it('uses 8×14 sample at scale 1', () => {
    const { cols, rows, samplew, sampleh } = cellcolsrows(80, 28, 1)
    expect(samplew).toBe(CHAR_WIDTH)
    expect(sampleh).toBe(CHAR_HEIGHT)
    expect(cols).toBe(10)
    expect(rows).toBe(2)
  })

  it('doubles sample size at scale 0.5', () => {
    const { cols, rows, samplew, sampleh } = cellcolsrows(80, 28, 0.5)
    expect(samplew).toBe(CHAR_WIDTH * 2)
    expect(sampleh).toBe(CHAR_HEIGHT * 2)
    expect(cols).toBe(5)
    expect(rows).toBe(1)
  })

  it('halves sample size at scale 2', () => {
    const { cols, rows, samplew, sampleh } = cellcolsrows(80, 28, 2)
    expect(samplew).toBe(CHAR_WIDTH / 2)
    expect(sampleh).toBe(CHAR_HEIGHT / 2)
    expect(cols).toBe(20)
    expect(rows).toBe(4)
  })
})

describe('imageimportwithincap', () => {
  it('accepts grids within cap', () => {
    expect(
      imageimportwithincap(
        CHAR_WIDTH * IMAGE_IMPORT_MAX_COLS,
        CHAR_HEIGHT * IMAGE_IMPORT_MAX_ROWS,
        1,
      ),
    ).toBe(true)
  })

  it('rejects grids above cap at high scale', () => {
    expect(
      imageimportwithincap(
        CHAR_WIDTH * IMAGE_IMPORT_MAX_COLS * 2,
        CHAR_HEIGHT,
        2,
      ),
    ).toBe(false)
  })
})

describe('pickcellglyph', () => {
  const { colorlist, palettergb } = makecolorlist()

  it('picks shade block for solid color', () => {
    const w = CHAR_WIDTH
    const h = CHAR_HEIGHT
    const data = new Uint8ClampedArray(w * h * 4)
    fillrect(data, w, 0, 0, w, h, 200, 200, 200)
    const glyph = pickcellglyph(data, w, 0, 0, w, h, colorlist, palettergb)
    expect(glyph).toBeDefined()
    expect([176, 177, 178, 219]).toContain(glyph?.[0])
  })

  it('picks vertical half-block for top/bottom split', () => {
    const w = CHAR_WIDTH
    const h = CHAR_HEIGHT
    const data = new Uint8ClampedArray(w * h * 4)
    fillrect(data, w, 0, 0, w, Math.floor(h / 2), 255, 0, 0)
    fillrect(data, w, 0, Math.floor(h / 2), w, h - Math.floor(h / 2), 0, 0, 255)
    const glyph = pickcellglyph(data, w, 0, 0, w, h, colorlist, palettergb)
    expect(glyph?.[0]).toBe(223)
  })

  it('picks horizontal half-block for left/right split', () => {
    const w = CHAR_WIDTH
    const h = CHAR_HEIGHT
    const data = new Uint8ClampedArray(w * h * 4)
    fillrect(data, w, 0, 0, Math.floor(w / 2), h, 255, 255, 0)
    fillrect(
      data,
      w,
      Math.floor(w / 2),
      0,
      w - Math.floor(w / 2),
      h,
      0,
      255,
      0,
    )
    const glyph = pickcellglyph(data, w, 0, 0, w, h, colorlist, palettergb)
    expect([221, 222]).toContain(glyph?.[0])
  })
})

describe('importscreentopatchwork', () => {
  it('writes terrain across multiple boards when width exceeds BOARD_WIDTH', () => {
    const mockbook = { name: 'testbook' }
    const mockboard = { id: 'board0', terrain: [] }
    ;(memoryreadfirstcontentbook as jest.Mock).mockReturnValue(mockbook)
    ;(memorycreatecodepage as jest.Mock).mockReturnValue({ id: 'cp0' })
    ;(memoryreadcodepagedata as jest.Mock).mockReturnValue(mockboard)

    const width = BOARD_WIDTH + 1
    const height = 1
    const screen: [number, number, number][] = []
    for (let i = 0; i < width * height; ++i) {
      screen.push([219, 7, 0])
    }

    importscreentopatchwork('player1', 'testpatch', width, height, screen)

    expect(memorywritecodepage).toHaveBeenCalledTimes(2)
    expect(memorywriteterrain).toHaveBeenCalled()
    const writcalls = (memorywriteterrain as jest.Mock).mock.calls.length
    expect(writcalls).toBe(width * height)
  })
})
