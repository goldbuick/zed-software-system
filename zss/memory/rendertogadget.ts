import { degToRad, radToDeg } from 'maath/misc'
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
  VIEWSCALE,
  CHAR_WIDTH,
  CHAR_HEIGHT,
} from 'zss/gadget/data/types'
import { circlepoints } from 'zss/mapping/2d'
import { ispid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLLISION, COLOR, NAME, PT } from 'zss/words/types'

import { checkdoescollide } from './atomics'
import { boardelementindex, boardobjectread } from './board'
import {
  bookelementdisplayread,
  bookelementkindread,
  bookreadcodepagewithtype,
  bookreadflags,
} from './book'
import { codepagereaddata } from './codepage'
import { BOARD, BOARD_HEIGHT, BOARD_WIDTH, BOOK, CODE_PAGE_TYPE } from './types'

import { MEMORY_LABEL, memoryreadbookbysoftware, memoryreadflags } from '.'

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
  const layermedia = LAYER_CACHE[id] as LAYER_MEDIA
  // handle copydata
  layermedia.mime = mime
  layermedia.media = media
  return layermedia
}

function createcachedcontrol(player: string, index: number): LAYER_CONTROL {
  const id = `control:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createcontrol(player, index)
  }
  return LAYER_CACHE[id] as LAYER_CONTROL
}

const hcw = CHAR_WIDTH * 0.75
const hch = CHAR_HEIGHT * 0.75
function mixmaxrange(from: PT, dest: PT): [number, number] {
  // calc corners
  const angles: number[] = []
  const dx = (dest.x - from.x) * CHAR_WIDTH
  const dy = (dest.y - from.y) * CHAR_HEIGHT
  pt1.x = dx - hcw
  pt1.y = dy - hch
  angles.push(pt1.angle())
  pt1.x = dx + hcw
  pt1.y = dy - hch
  angles.push(pt1.angle())
  pt1.x = dx - hcw
  pt1.y = dy + hch
  angles.push(pt1.angle())
  pt1.x = dx + hcw
  pt1.y = dy + hch
  angles.push(pt1.angle())
  const minangle = Math.round(radToDeg(Math.min(...angles)))
  const maxangle = Math.round(radToDeg(Math.max(...angles)))
  if (Math.abs(minangle - maxangle) > 180) {
    return [maxangle, minangle]
  }
  return [minangle, maxangle]
}

function raycheck(
  book: BOOK,
  board: BOARD,
  alphas: number[],
  blocked: [number, number, number][],
  nextblocked: [number, number, number][],
  sprite: SPRITE,
  radius: number,
  falloff: number,
  x: number,
  y: number,
) {
  // check distance
  pt1.x = x - sprite.x
  pt1.y = y - sprite.y
  const raydist = pt1.length()
  if (raydist > radius) {
    return
  }

  // check index
  const pt = { x, y }
  const idx = boardelementindex(board, pt)
  if (idx === -1) {
    return
  }

  // check angle
  const angle = Math.round(radToDeg(pt1.angle()))

  // current falloff
  let current = 0
  for (let b = 0; b < blocked.length; ++b) {
    const range = blocked[b]
    // between min & max
    if (angle >= range[0] && angle <= range[1]) {
      // take highest value
      current = Math.max(current, range[2])
    }
  }

  // update shading
  const hradius = radius * 0.5
  alphas[idx] = Math.min(
    alphas[idx],
    current + (raydist < hradius ? 0 : (raydist - hradius) * falloff),
  )
  alphas[idx] = clamp(alphas[idx], 0, 1)

  // check lookup
  const object = boardobjectread(board, board.lookup?.[idx] ?? '')
  if (ispresent(object)) {
    // half blocked
    const range: [number, number, number] = [...mixmaxrange(sprite, pt), 0.25]
    nextblocked.push(range)
  }

  const maybeterrain = board.terrain[idx]
  const terrainkind = bookelementkindread(book, maybeterrain)
  const terraincollision = maybeterrain?.collision ?? terrainkind?.collision
  if (checkdoescollide(COLLISION.ISBULLET, terraincollision)) {
    // fully blocked
    const range: [number, number, number] = [...mixmaxrange(sprite, pt), 1]
    nextblocked.push(range)
  }
}

export function memoryconverttogadgetlayers(
  player: string,
  index: number,
  book: BOOK,
  board: MAYBE<BOARD>,
  tickercolor: COLOR,
  isprimary: boolean,
  isbaseboard: boolean,
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
      tickercolor,
      COLOR.ONCLEAR,
    ),
    ...tickers,
  }

  const control = createcachedcontrol(player, iiii++)

  // hack to keep only one control layer
  if (isprimary) {
    layers.push(control)
    if (isstring(board.camera)) {
      switch (NAME(board.camera)) {
        default:
        case 'mid':
          control.viewscale = VIEWSCALE.MID
          break
        case 'near':
          control.viewscale = VIEWSCALE.NEAR
          break
        case 'far':
          control.viewscale = VIEWSCALE.FAR
          break
      }
    }
    if (isstring(board.graphics)) {
      const graphics = NAME(board.graphics)
      switch (graphics) {
        case 'mode7':
        case 'firstperson':
          control.graphics = graphics
          break
        default:
        case 'flat':
          control.graphics = 'flat'
          break
      }
    }
    const { facing } = memoryreadflags(player)
    if (isnumber(facing)) {
      control.facing = degToRad(facing % 360)
    }
  }

  for (let i = 0; i < board.terrain.length; ++i) {
    const tile = board.terrain[i]
    const display = bookelementdisplayread(
      book,
      tile,
      0,
      COLOR.WHITE,
      isbaseboard ? COLOR.BLACK : COLOR.ONCLEAR,
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
        // min, max, value
        const blocked: [number, number, number][] = []
        const center = boardelementindex(board, sprite)
        const radius = clamp(Math.round(display.light), 1, BOARD_HEIGHT)
        const step = 1 / (radius * 0.5)

        lighting.alphas[center] = 0
        if (radius > 1) {
          for (let r = 1; r <= radius; ++r) {
            const nextblocked: [number, number, number][] = []
            for (let y = sprite.y - r; y <= sprite.y + r; ++y) {
              raycheck(
                book,
                board,
                lighting.alphas,
                blocked,
                nextblocked,
                sprite,
                radius,
                step,
                sprite.x - r,
                y,
              )
              raycheck(
                book,
                board,
                lighting.alphas,
                blocked,
                nextblocked,
                sprite,
                radius,
                step,
                sprite.x + r,
                y,
              )
            }
            const inset = r - 1
            for (let x = sprite.x - inset; x <= sprite.x + inset; ++x) {
              raycheck(
                book,
                board,
                lighting.alphas,
                blocked,
                nextblocked,
                sprite,
                radius,
                step,
                x,
                sprite.y - r,
              )
              raycheck(
                book,
                board,
                lighting.alphas,
                blocked,
                nextblocked,
                sprite,
                radius,
                step,
                x,
                sprite.y + r,
              )
            }
            blocked.push(...nextblocked)
          }
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

  // set mood
  layers.push(
    createcachedmedia(player, iiii++, 'text/mood', isdark ? 'dark' : 'bright'),
  )

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
    const palette = codepagereaddata<CODE_PAGE_TYPE.PALETTE>(codepage)
    if (ispresent(palette?.bits)) {
      layers.push(
        createcachedmedia(
          player,
          iiii++,
          'image/palette',
          Array.from(palette.bits),
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
    const charset = codepagereaddata<CODE_PAGE_TYPE.CHARSET>(codepage)
    if (ispresent(charset?.bits)) {
      layers.push(
        createcachedmedia(
          player,
          iiii++,
          'image/charset',
          Array.from(charset.bits),
        ),
      )
    }
  }

  // add media layer to list peer ids
  const pids = Object.keys(board.objects).filter(ispid)
  layers.push(createcachedmedia(player, iiii++, 'text/players', pids.join(',')))

  // return result
  return layers
}
