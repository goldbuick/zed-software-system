import { clamp } from 'maath/misc'
import { Vector2 } from 'three'
import {
  createdither,
  createcontrol,
  createsprite,
  createsprites,
  createtiles,
  LAYER,
  createmedia,
} from 'zss/gadget/data/types'
import { circlepoints, linepoints } from 'zss/mapping/2d'
import { deepcopy, isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLLISION, COLOR } from 'zss/words/types'

import { checkcollision } from './atomics'
import { boardelementindex, boardobjectread } from './board'
import {
  bookelementdisplayread,
  bookelementkindread,
  bookreadcodepagewithtype,
  bookreadflags,
} from './book'
import { BOARD, BOARD_HEIGHT, BOARD_WIDTH, BOOK, CODE_PAGE_TYPE } from './types'

import { MEMORY_LABEL, memoryreadbookbysoftware } from '.'

let decoticker = 0
function readdecotickercolor(): COLOR {
  switch (decoticker++) {
    case 0:
      return COLOR.BLUE
    case 1:
      return COLOR.GREEN
    case 2:
      return COLOR.CYAN
    case 3:
      return COLOR.RED
    case 4:
      return COLOR.PURPLE
    case 5:
      return COLOR.YELLOW
    default:
      decoticker = 0
      return COLOR.WHITE
  }
}

const pt1 = new Vector2()

export function memoryconverttogadgetlayers(
  player: string,
  index: number,
  book: BOOK,
  board: BOARD,
  isprimary: boolean,
): LAYER[] {
  const layers: LAYER[] = []

  let iiii = index
  const isbaseboard = iiii === 0
  const boardwidth = BOARD_WIDTH
  const boardheight = BOARD_HEIGHT
  const defaultcolor = isbaseboard ? COLOR.BLACK : COLOR.ONCLEAR

  const tiles = createtiles(
    player,
    iiii++,
    boardwidth,
    boardheight,
    defaultcolor,
  )
  layers.push(tiles)

  const objectindex = iiii++
  const objects = createsprites(player, objectindex)
  layers.push(objects)

  const lighting = createdither(
    player,
    iiii++,
    boardwidth,
    boardheight,
    board.isdark ? 1 : 0,
  )
  layers.push(lighting)

  const tickers = createtiles(
    player,
    iiii++,
    boardwidth,
    boardheight,
    COLOR.ONCLEAR,
  )
  layers.push(tickers)

  const tickercontext = {
    ...createwritetextcontext(
      BOARD_WIDTH,
      BOARD_HEIGHT,
      readdecotickercolor(),
      COLOR.ONCLEAR,
    ),
    ...tickers,
  }

  const control = createcontrol(player, iiii++)
  // hack to keep only one control layer
  if (isprimary) {
    layers.push(control)
  }

  for (let i = 0; i < board.terrain.length; ++i) {
    const tile = board.terrain[i]
    const display = bookelementdisplayread(
      book,
      tile,
      0,
      COLOR.BLACK,
      COLOR.ONCLEAR,
    )
    tiles.char[i] = display.char
    tiles.color[i] = display.color
    tiles.bg[i] = display.bg
  }

  // smooth lighting
  function aa(x: number, y: number) {
    if (x < 0 || x >= boardwidth || y < 0 || y >= boardheight) {
      return undefined
    }
    return lighting.alphas[x + y * boardwidth]
  }

  const boardobjects = Object.values(board.objects ?? {})
  for (let i = 0; i < boardobjects.length; ++i) {
    const object = boardobjects[i]
    // skip if marked for removal or headless
    if (ispresent(object.removed) || ispresent(object.headless)) {
      continue
    }

    // should we have bg transparent or match the bg color of the terrain ?
    const id = object.id ?? ''
    const display = bookelementdisplayread(
      book,
      object,
      1,
      COLOR.WHITE,
      COLOR.ONCLEAR,
    )
    const sprite = createsprite(player, objectindex, id)

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = display.char
    sprite.color = display.color
    sprite.bg = display.bg
    objects.sprites.push(sprite)

    // write lighting if needed
    if (board.isdark && isnumber(display.light)) {
      const cpoints = circlepoints(sprite.x, sprite.y, display.light)
      for (let c = 0; c < cpoints.length; ++c) {
        let falloff = 0
        const cp = cpoints[c]
        const line = linepoints(sprite.x, sprite.y, cp.x, cp.y)
        for (let i = 0; i < line.length; i++) {
          const lp = line[i]
          if (
            lp.x < 0 ||
            lp.x >= boardwidth ||
            lp.y < 0 ||
            lp.y >= boardheight
          ) {
            break
          }

          // measure dist
          const dist = pt1.subVectors(lp, sprite).length()
          const ratio = dist / (display.light + 1)
          const value = clamp(ratio + falloff, 0, 1)
          const invert = 1 - value
          const li = lp.x + lp.y * boardwidth
          lighting.alphas[li] = clamp(lighting.alphas[li] - invert, 0, 1)

          // clipping
          const index = boardelementindex(board, lp)
          if (index < 0 || !ispresent(board?.lookup)) {
            break
          }

          // check lookup
          if (lp.x !== sprite.x || lp.y !== sprite.y) {
            const object = boardobjectread(board, board.lookup[index] ?? '')
            if (ispresent(object)) {
              falloff += 0.5
            }
          }

          const maybeterrain = board.terrain[index]
          const terrainkind = bookelementkindread(book, maybeterrain)
          const terraincollision =
            maybeterrain?.collision ?? terrainkind?.collision
          if (checkcollision(COLLISION.ISWALK, terraincollision)) {
            break
          }
        }
      }
    }

    const weights = [
      [0.01, 0.01, 0.01],
      [0.01, 1.0, 0.01],
      [0.01, 0.01, 0.01],
    ].flat()

    const alphas = deepcopy(lighting.alphas)
    for (let i = 0; i < lighting.alphas.length; ++i) {
      // coords
      const cx = i % boardwidth
      const cy = Math.floor(i / boardwidth)

      // weighted average
      const values = [
        [aa(cx - 1, cy - 1), aa(cx, cy - 1), aa(cx + 1, cy - 1)],
        [aa(cx - 1, cy), aa(cx, cy), aa(cx + 1, cy)],
        [aa(cx - 1, cy + 1), aa(cx, cy + 1), aa(cx + 1, cy + 1)],
      ]
        .flat()
        .map((value, i) =>
          ispresent(value) ? [value * weights[i], weights[i]] : undefined,
        )
        .filter(ispresent)

      const wtotal = values
        .map(([, weight]) => weight)
        .reduce((t, v) => t + v, 0)
      const vtotal = values.map(([value]) => value).reduce((t, v) => t + v, 0)
      // final shade
      alphas[i] = vtotal / wtotal
    }

    // update lighting data
    lighting.alphas = deepcopy(alphas)

    // write ticker messages
    if (
      isstring(object.tickertext) &&
      isnumber(object.tickertime) &&
      object.tickertext.length
    ) {
      // calc placement
      const TICKER_WIDTH = BOARD_WIDTH
      const measure = tokenizeandmeasuretextformat(
        object.tickertext,
        TICKER_WIDTH,
        BOARD_HEIGHT - 1,
      )
      const width = measure?.measuredwidth ?? 1
      const x = object.x ?? 0
      const y = object.y ?? 0
      const upper = y < BOARD_HEIGHT * 0.5
      tickercontext.x = x - Math.floor(width * 0.5)
      tickercontext.y = y + (upper ? 1 : -1)
      // clip placement
      if (tickercontext.x + width > BOARD_WIDTH) {
        tickercontext.x = BOARD_WIDTH - width
      }
      if (tickercontext.x < 0) {
        tickercontext.x = 0
      }
      // render text
      tokenizeandwritetextformat(object.tickertext, tickercontext, true)
    }

    // inform control layer where to focus
    if (id === player) {
      control.focusx = sprite.x
      control.focusy = sprite.y
      control.focusid = id
    }
  }

  // check for display media
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  const bookflags = bookreadflags(mainbook, MEMORY_LABEL.MAIN)

  // check for palette
  if (isstring(bookflags.palette)) {
    const codepage = bookreadcodepagewithtype(
      mainbook,
      CODE_PAGE_TYPE.PALETTE,
      bookflags.palette,
    )
    if (ispresent(codepage?.palette?.bits)) {
      layers.push(
        createmedia(
          player,
          iiii++,
          'image/palette',
          Array.from(codepage.palette.bits),
        ),
      )
    }
  }

  // check for charset
  if (isstring(bookflags.charset)) {
    const codepage = bookreadcodepagewithtype(
      mainbook,
      CODE_PAGE_TYPE.CHARSET,
      bookflags.charset,
    )
    if (ispresent(codepage?.charset?.bits)) {
      layers.push(
        createmedia(
          player,
          iiii++,
          'image/charset',
          Array.from(codepage.charset.bits),
        ),
      )
    }
  }

  // return result
  return layers
}
