/**
 * Validate corpus screenshot pipeline produces visible board content (not blank black).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { LAYER_TYPE } from 'zss/gadget/data/types'
import {
  defaultcapturemedia,
  rasterizelayerstorgba,
} from 'zss/gadget/capture/rasterize'
import { importzztboardstobook } from 'zss/feature/parse/zzt'
import { zztparseworld } from 'zss/feature/parse/zztbinparse'
import { memoryreadelementdisplay } from 'zss/memory/bookoperations'
import { memoryreadboardbyaddress, memoryinitboard } from 'zss/memory/boards'
import { memoryreadgadgetlayers } from 'zss/memory/rendering'
import {
  memoryclearbook,
  memoryresetbooks,
  memorywritebook,
} from 'zss/memory/session'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

function countnonzerorgb(rgba: Uint8ClampedArray): number {
  let count = 0
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i] || rgba[i + 1] || rgba[i + 2]) {
      count += 1
    }
  }
  return count
}

function countlayernonzerochar(layers: ReturnType<typeof memoryreadgadgetlayers>) {
  let total = 0
  for (const layer of layers.layers) {
    if (layer.type !== LAYER_TYPE.TILES) {
      continue
    }
    for (let i = 0; i < layer.char.length; ++i) {
      if (layer.char[i] !== 0) {
        total += 1
      }
    }
  }
  return total
}

describe('corpus screenshot validation', () => {
  const root = process.cwd()
  const zztpath = path.join(
    root,
    'ops/fixtures/zzt/corpus/extracted/1/00614D/00614D.ZZT',
  )

  beforeEach(() => {
    memoryresetbooks([])
  })

  it('imports a real board with terrain tiles', () => {
    const bytes = readFileSync(zztpath)
    const parsed = zztparseworld(new Uint8Array(bytes))
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
      const board = memoryreadboardbyaddress(boardaddresses[1])
      expect(board).toBeDefined()
      if (!board) {
        return
      }

      const nonemptyterrain = board.terrain?.filter((t) => t.kind).length ?? 0
      expect(nonemptyterrain).toBeGreaterThan(0)

      memoryinitboard(board)

      const sample = board.terrain?.find((t) => t.kind)
      expect(sample?.kind).toBeTruthy()
      if (sample) {
        const display = memoryreadelementdisplay(sample)
        expect(display.char).toBeGreaterThan(0)
      }

      const gadgetlayers = memoryreadgadgetlayers('flat', board)
      const tilechars = countlayernonzerochar(gadgetlayers)
      expect(tilechars).toBeGreaterThan(0)

      const media = defaultcapturemedia()
      const { width, height, rgba } = rasterizelayerstorgba(
        gadgetlayers.layers,
        media.charset,
        media.palette,
      )
      expect(width).toBe(960)
      expect(height).toBe(700)

      const nonzero = countnonzerorgb(rgba)
      expect(nonzero).toBeGreaterThan(1000)
    } finally {
      memoryclearbook(book.id)
    }
  })
})
