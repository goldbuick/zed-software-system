import { clamp } from 'maath/misc'
import { Vector2 } from 'three'
import {
  createdither,
  createlayercontrol,
  createsprite,
  createsprites,
  createtiles,
  LAYER,
} from 'zss/gadget/data/types'
import { circlepoints, linepoints } from 'zss/mapping/2d'
import { average } from 'zss/mapping/array'
import { isnumber, ispresent, isstring } from 'zss/mapping/types'
import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLLISION, COLOR } from 'zss/words/types'

import { checkcollision } from './atomics'
import { boardelementindex, boardelementread, boardobjectread } from './board'
import { bookelementdisplayread, bookelementkindread } from './book'
import { BOARD, BOARD_HEIGHT, BOARD_WIDTH, BOOK } from './types'

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

  let i = index
  const isbaseboard = i === 0
  const boardwidth = BOARD_WIDTH
  const boardheight = BOARD_HEIGHT
  const defaultcolor = isbaseboard ? COLOR.BLACK : COLOR.ONCLEAR

  const tiles = createtiles(player, i++, boardwidth, boardheight, defaultcolor)
  layers.push(tiles)

  const objectindex = i++
  const objects = createsprites(player, objectindex)
  layers.push(objects)

  const lighting = createdither(
    player,
    i++,
    boardwidth,
    boardheight,
    board.isdark ? 1 : 0,
  )
  layers.push(lighting)

  const tickers = createtiles(
    player,
    i++,
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

  const control = createlayercontrol(player, i++)
  // hack to keep only one control layer
  if (isprimary) {
    layers.push(control)
  }

  board.terrain.forEach((tile, i) => {
    if (tile) {
      const kind = bookelementkindread(book, tile)
      tiles.char[i] = tile.char ?? kind?.char ?? 0
      tiles.color[i] = tile.color ?? kind?.color ?? defaultcolor
      tiles.bg[i] = tile.bg ?? kind?.bg ?? defaultcolor
    }
  })

  const boardobjects = board.objects ?? {}
  Object.values(boardobjects).forEach((object) => {
    // skip if marked for removal or headless
    if (ispresent(object.removed) || ispresent(object.headless)) {
      return
    }

    // should we have bg transparent or match the bg color of the terrain ?
    const id = object.id ?? ''
    const display = bookelementdisplayread(book, object)
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
      const cpoints = [
        circlepoints(sprite.x, sprite.y, display.light),
        circlepoints(sprite.x, sprite.y, display.light - 1),
      ].flat()
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
          const value = clamp(ratio + falloff, 0, 0.99)
          const li = lp.x + lp.y * boardwidth
          lighting.alphas[li] = Math.min(lighting.alphas[li], value)

          // clipping
          const index = boardelementindex(board, lp)
          if (index < 0 || !ispresent(board?.lookup)) {
            break
          }

          // check lookup
          if (lp.x !== sprite.x || lp.y !== sprite.y) {
            const object = boardobjectread(board, board.lookup[index] ?? '')
            if (ispresent(object)) {
              falloff += 0.25
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
  })

  // return result
  return layers
}
