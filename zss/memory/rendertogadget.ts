import { radToDeg } from 'maath/misc'
import { Vector2 } from 'three'
import {
  createdither,
  createcontrol,
  createsprite,
  createsprites,
  createtiles,
  LAYER,
  createmedia,
  LAYER_TILES,
  LAYER_SPRITES,
  LAYER_DITHER,
  LAYER_MEDIA,
  LAYER_CONTROL,
  SPRITE,
} from 'zss/gadget/data/types'
import { ptdist } from 'zss/mapping/2d'
import { ispid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent, isstring, MAYBE } from 'zss/mapping/types'
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

const LAYER_CACHE: Record<string, LAYER> = {}
const SPRITE_CACHE: Record<string, SPRITE> = {}

function createcachedtiles(
  player: string,
  index: number,
  width: number,
  height: number,
  bg = 0,
): LAYER_TILES {
  const id = `tiles:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createtiles(player, index, width, height, bg)
  }
  return LAYER_CACHE[id] as LAYER_TILES
}

export function createcachedsprite(
  player: string,
  index: number,
  id: string,
  spriteindex: number,
): SPRITE {
  const uid = `sprites:${player}:${index}:${id}`
  const cid = `sprite:${player}:${index}:${spriteindex}`
  if (!ispresent(SPRITE_CACHE[cid])) {
    SPRITE_CACHE[cid] = createsprite(player, index, id)
  }
  SPRITE_CACHE[cid].id = uid
  return SPRITE_CACHE[cid]
}

function createcachedsprites(player: string, index: number): LAYER_SPRITES {
  const id = `sprites:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createsprites(player, index)
  }
  return LAYER_CACHE[id] as LAYER_SPRITES
}

function createcacheddither(
  player: string,
  index: number,
  width: number,
  height: number,
  fill = 0,
): LAYER_DITHER {
  const id = `dither:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createdither(player, index, width, height, fill)
  }
  return LAYER_CACHE[id] as LAYER_DITHER
}

function createcachedmedia(
  player: string,
  index: number,
  mime: string,
  media: string | number[],
): LAYER_MEDIA {
  const id = `media:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createmedia(player, index, mime, media)
  }
  return LAYER_CACHE[id] as LAYER_MEDIA
}

function createcachedcontrol(player: string, index: number): LAYER_CONTROL {
  const id = `control:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createcontrol(player, index)
  }
  return LAYER_CACHE[id] as LAYER_CONTROL
}

export function memoryconverttogadgetlayers(
  player: string,
  index: number,
  book: BOOK,
  board: MAYBE<BOARD>,
  isprimary: boolean,
): LAYER[] {
  if (
    !ispresent(board) ||
    !ispresent(board.terrain) ||
    !ispresent(board.objects)
  ) {
    return []
  }

  const layers: LAYER[] = []

  let iiii = index
  const isbaseboard = iiii === 0
  const boardwidth = BOARD_WIDTH
  const boardheight = BOARD_HEIGHT
  const defaultcolor = isbaseboard ? COLOR.BLACK : COLOR.ONCLEAR

  const tiles = createcachedtiles(
    player,
    iiii++,
    boardwidth,
    boardheight,
    defaultcolor,
  )
  layers.push(tiles)

  const objectindex = iiii++
  const objects = createcachedsprites(player, objectindex)
  objects.sprites = []
  layers.push(objects)

  const isdark = board.isdark ? 1 : 0
  const lighting = createcacheddither(
    player,
    iiii++,
    boardwidth,
    boardheight,
    isdark,
  )
  layers.push(lighting)
  // reset
  lighting.alphas.fill(isdark)

  const tickers = createcachedtiles(
    player,
    iiii++,
    boardwidth,
    boardheight,
    COLOR.ONCLEAR,
  )
  layers.push(tickers)
  tickers.char.fill(0)

  const tickercontext = {
    ...createwritetextcontext(
      BOARD_WIDTH,
      BOARD_HEIGHT,
      readdecotickercolor(),
      COLOR.ONCLEAR,
    ),
    ...tickers,
  }

  const control = createcachedcontrol(player, iiii++)
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

  const boardobjects = Object.values(board.objects ?? {})
  for (let i = 0; i < boardobjects.length; ++i) {
    const object = boardobjects[i]
    if (ispresent(object.removed)) {
      continue
    }

    const id = object.id ?? ''
    const display = bookelementdisplayread(
      book,
      object,
      1,
      COLOR.WHITE,
      COLOR.BLACK,
    )
    const sprite = createcachedsprite(player, objectindex, id, i)

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = display.char
    sprite.color = display.color
    sprite.bg = display.bg
    objects.sprites.push(sprite)

    // write lighting if needed
    if (isdark) {
      if (display.light > 0) {
        const falloff = new Map<number, number>()
        const radius = Math.round(display.light)
        const center = boardelementindex(board, sprite)
        lighting.alphas[center] = 0
        if (radius > 1) {
          for (let r = 1; r <= radius; ++r) {
            const edge = r === radius
            for (let y = sprite.y - r; y <= sprite.y + r; ++y) {
              for (let x = sprite.x - r; x <= sprite.x + r; ++x) {
                // skip self
                if (x === sprite.x && y === sprite.y) {
                  continue
                }

                // check distance
                pt1.x = x - sprite.x
                pt1.y = y - sprite.y
                if (pt1.length() > radius) {
                  continue
                }

                // check index
                const idx = boardelementindex(board, { x, y })
                if (idx === -1) {
                  continue
                }

                // check angle
                const angle = Math.round(radToDeg(pt1.angle()) * 0.05)

                // current falloff
                let current = falloff.get(angle) ?? 0

                // update shading
                const invert = 1 - current
                lighting.alphas[idx] = lighting.alphas[idx] - invert
                lighting.alphas[idx] = clamp(lighting.alphas[idx], 0, 1)

                // check lookup
                const object = boardobjectread(board, board.lookup?.[idx] ?? '')
                if (ispresent(object)) {
                  // half blocked
                  current += 0.5
                }

                const maybeterrain = board.terrain[idx]
                const terrainkind = bookelementkindread(book, maybeterrain)
                const terraincollision =
                  maybeterrain?.collision ?? terrainkind?.collision
                if (checkcollision(COLLISION.ISBULLET, terraincollision)) {
                  // fully blocked
                  current += 1
                }

                // update falloff
                falloff.set(angle, clamp(current + 0.111111, 0, 1))
              }
            }
          }
        }
        if (falloff.size) {
          // console.info(falloff)
          // debugger
        }
      } else if (ispid(id)) {
        // always show player
        const index = boardelementindex(board, sprite)
        lighting.alphas[index] = 0
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
        createcachedmedia(
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
        createcachedmedia(
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
