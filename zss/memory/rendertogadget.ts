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
import { ispid } from 'zss/mapping/guid'
import { clamp } from 'zss/mapping/number'
import { isnumber, ispresent, isstring, MAYBE } from 'zss/mapping/types'
import { dirfrompts, isstrdir } from 'zss/words/dir'
import {
  createwritetextcontext,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { COLLISION, COLOR, DIR, NAME, PT } from 'zss/words/types'

import { checkdoescollide } from './atomics'
import { boardelementindex, boardobjectread } from './board'
import {
  bookelementdisplayread,
  bookelementkindread,
  bookelementstatread,
  bookreadcodepagewithtype,
  bookreadflags,
} from './book'
import { boardevaldir } from './bookboard'
import { codepagereaddata } from './codepage'
import { BOARD, BOARD_HEIGHT, BOARD_WIDTH, BOOK, CODE_PAGE_TYPE } from './types'

import { MEMORY_LABEL, memoryreadbookbysoftware, memoryreadflags } from '.'

const pt1 = new Vector2()

const LAYER_CACHE: Record<string, LAYER> = {}
const SPRITE_CACHE: Record<string, SPRITE> = {}

function createcachedtiles(
  player: string,
  index: number,
  tag: string,
  width: number,
  height: number,
  bg = 0,
): LAYER_TILES {
  const id = `tiles:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createtiles(player, index, tag, width, height, bg)
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

const CHAR_MARGIN = 3
function mixmaxrange(from: PT, dest: PT): [number, number] {
  // calc corners
  const angles: number[] = []

  const fromx = (from.x + 0.5) * CHAR_WIDTH
  const fromy = (from.y + 0.5) * CHAR_HEIGHT
  const destx = dest.x * CHAR_WIDTH
  const desty = dest.y * CHAR_HEIGHT
  const dx = destx - fromx
  const dy = desty - fromy

  pt1.x = dx - CHAR_MARGIN
  pt1.y = dy - CHAR_MARGIN
  angles.push(pt1.angle())
  pt1.x = dx + CHAR_WIDTH + CHAR_MARGIN
  pt1.y = dy - CHAR_MARGIN
  angles.push(pt1.angle())
  pt1.x = dx - CHAR_MARGIN
  pt1.y = dy + CHAR_HEIGHT + CHAR_MARGIN
  angles.push(pt1.angle())
  pt1.x = dx + CHAR_WIDTH + CHAR_MARGIN
  pt1.y = dy + CHAR_HEIGHT + CHAR_MARGIN
  angles.push(pt1.angle())

  const degs = angles.map((v) => Math.round(radToDeg(v)))
  const minangle = Math.min(...degs)
  const maxangle = Math.max(...degs)
  const diff = maxangle - minangle

  // handle inverted case
  if (diff > 180) {
    // acute angles
    const a1 = degs.filter((angle) => angle < 180)
    // obtuse angles
    const a2 = degs.filter((angle) => angle > 180)
    // we go from the largest acute angle
    const newminangle = Math.max(...a1)
    // to the smallest obtuse angle
    const newmaxangle = Math.min(...a2)
    return [newmaxangle, newminangle]
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
  // check index
  const pt = { x, y }
  const idx = boardelementindex(board, pt)
  if (idx === -1) {
    return
  }

  // check distance
  pt1.x = x - sprite.x
  pt1.y = y - sprite.y
  const raydist = pt1.length()
  if (raydist > radius) {
    return
  }

  // check angle
  const angle = Math.round(radToDeg(pt1.angle()))

  // current falloff
  let current = 0
  for (let b = 0; b < blocked.length; ++b) {
    const [minangle, maxangle, value] = blocked[b]
    // inverted edge case
    if (minangle > maxangle) {
      if (angle >= minangle || angle <= maxangle) {
        current = Math.max(current, value)
      }
    } else if (angle >= minangle && angle <= maxangle) {
      // take highest value
      current = Math.max(current, value)
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
    'terrain',
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
    'tickers',
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
        case 'fpv':
        case 'iso':
        case 'mode7':
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
    const collision = bookelementstatread(book, tile, 'collision')
    tiles.char[i] = display.char
    tiles.color[i] = display.color
    tiles.bg[i] = display.bg
    tiles.wall[i] = collision === COLLISION.ISSOLID ? 1 : 0
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
        const center = boardelementindex(board, sprite)
        const radius = clamp(Math.round(display.light), 1, BOARD_HEIGHT)
        const step = 1 / (radius * 0.5)

        lighting.alphas[center] = 0
        if (radius > 1) {
          // min, max, value
          const blocked: [number, number, number][] = []
          for (let r = 1; r <= radius; ++r) {
            // light dir for a cone of light
            if (r === 2) {
              const maybedir = bookelementstatread(book, object, 'lightdir')
              if (isstrdir(maybedir)) {
                const lightdir = boardevaldir(
                  book,
                  board,
                  object,
                  '',
                  maybedir,
                  sprite,
                )
                switch (dirfrompts(sprite, lightdir.destpt)) {
                  case DIR.EAST:
                    blocked.push([45, 315, 1])
                    break
                  case DIR.WEST:
                    blocked.push([225, 135, 1])
                    break
                  case DIR.NORTH:
                    blocked.push([315, 225, 1])
                    break
                  case DIR.SOUTH:
                    blocked.push([135, 45, 1])
                    break
                }
              }
            }
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
            // process newly blocked angles
            for (let nb = 0; nb < nextblocked.length; ++nb) {
              const range = nextblocked[nb]
              let b = 0
              for (b = 0; b < blocked.length; ++b) {
                const block = blocked[b]
                if (block[1] > block[0]) {
                  if (
                    range[1] >= block[0] &&
                    range[0] <= block[1] &&
                    range[2] >= 1 &&
                    block[2] >= 1
                  ) {
                    // merged
                    blocked[b] = [
                      Math.min(range[0], block[0]),
                      Math.max(range[1], block[1]),
                      1,
                    ]
                    break
                  }
                }
              }
              if (b === blocked.length) {
                blocked.push(range)
              }
            }
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
