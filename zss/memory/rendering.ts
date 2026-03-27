import { degToRad } from 'maath/misc'
import {
  LAYER,
  LAYER_CONTROL,
  LAYER_DITHER,
  LAYER_MEDIA,
  LAYER_SPRITES,
  LAYER_TILES,
  LAYER_TYPE,
  SPRITE,
  VIEWSCALE,
  createcontrol,
  createdither,
  createmedia,
  createsprite,
  createsprites,
  createtiles,
  layersreadmedia,
} from 'zss/gadget/data/types'
import { pttoindex } from 'zss/mapping/2d'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { COLLISION, COLOR, DIR, NAME, PT } from 'zss/words/types'

import { memoryreadobject } from './boardaccess'
import {
  memoryboardlightingapplyobject,
  memoryboardlightingmarkplayer,
} from './boardlighting'
import {
  memoryinitboard,
  memoryreadboardbyaddress,
  memoryreadelementstat,
  memoryreadoverboard,
  memoryreadunderboard,
} from './boards'
import { memoryupdateboardvisuals } from './boardvisuals'
import { memoryreadelementdisplay } from './bookoperations'
import {
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagetype,
} from './codepageoperations'
import { memorypickcodepagewithtypeandstat } from './codepages'
import { memoryreadflags } from './flags'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'

// Display & Formatting Functions

export function memorycodepagetoprefix(codepage: MAYBE<CODE_PAGE>) {
  const type = memoryreadcodepagetype(codepage)
  // if the codepage is a terrain or object, we can return the display prefix
  if (type === CODE_PAGE_TYPE.TERRAIN || type === CODE_PAGE_TYPE.OBJECT) {
    const name = memoryreadcodepagename(codepage)
    const stub: BOARD_ELEMENT = {
      kind: name,
      kinddata: memoryreadcodepagedata<CODE_PAGE_TYPE.TERRAIN>(codepage),
    }
    return `${memoryelementtodisplayprefix(stub)}$ONCLEAR$BLUE `
  }
  return ''
}

export function memoryconverttogadgetcontrollayer(
  player: string,
  index: number,
  board: MAYBE<BOARD>,
): LAYER[] {
  const control = createcachedcontrol(player, index)
  const maybeobject = memoryreadobject(board, player)
  if (!ispresent(board) || !ispresent(maybeobject)) {
    return []
  }

  // setup focus
  control.focusid = maybeobject.id ?? ''
  control.focusx = maybeobject.x ?? 0
  control.focusy = maybeobject.y ?? 0

  // player flags, then board flags
  const { graphics, camera, facing } = readgraphics(player, board)
  if (isstring(graphics)) {
    const withgraphics = NAME(graphics)
    switch (graphics) {
      case 'fpv':
      case 'iso':
      case 'flat':
      case 'mode7':
        control.graphics = withgraphics
        break
      default:
        control.graphics = 'flat'
        break
    }
  }

  if (isstring(camera)) {
    switch (NAME(camera)) {
      default:
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

  if (isnumber(facing)) {
    control.facing = degToRad(facing)
  }

  return [control]
}

export function memoryconverttogadgetlayers(
  player: string,
  index: number,
  board: MAYBE<BOARD>,
  tickers: string[],
  whichlayer: DIR.UNDER | DIR.MID | DIR.OVER,
  multi = false,
): LAYER[] {
  if (
    !ispresent(board) ||
    !ispresent(board.terrain) ||
    !ispresent(board.objects)
  ) {
    return []
  }

  // make sure lookup is created
  memoryinitboard(board)

  // update resolve caches
  memoryupdateboardvisuals(board)

  const withgraphics = NAME(readgraphics(player, board).graphics)
  const layers: LAYER[] = []

  let iiii = index
  const boardid = board.id
  const boardwidth = BOARD_WIDTH
  const boardheight = BOARD_HEIGHT
  const tiles = createcachedtiles(
    boardid,
    iiii++,
    boardwidth,
    boardheight,
    COLOR.BLACK,
  )
  layers.push(tiles)

  const objectindex = iiii++
  const objects = memorycreatecachedsprites(boardid, objectindex)
  objects.sprites = []
  layers.push(objects)

  const isdark = board.isdark ? 1 : 0
  const lighting = createcacheddither(
    boardid,
    iiii++,
    boardwidth,
    boardheight,
    isdark,
  )
  layers.push(lighting)

  // reset
  lighting.alphas.fill(isdark)

  for (let i = 0; i < board.terrain.length; ++i) {
    const tile = board.terrain[i]
    const display = memoryreadelementdisplay(
      tile,
      0,
      COLOR.WHITE,
      whichlayer === DIR.OVER ? COLOR.ONCLEAR : COLOR.BLACK,
    )
    const collision = memoryreadelementstat(tile, 'collision')
    let char = display.char
    if (
      withgraphics === 'fpv' &&
      (multi || ispresent(memoryreadelementstat(tile, 'sky')))
    ) {
      char = -char
    }
    tiles.char[i] = char
    tiles.color[i] = display.color
    tiles.bg[i] = display.bg
    tiles.stats[i] = collision
  }

  const boardobjects = Object.values(board.objects ?? {})

  // create always show player spots
  const playerspots = new Set<number>()
  for (let i = 0; i < boardobjects.length; ++i) {
    const object = boardobjects[i]
    if (ispid(object.id) && isnumber(object.x) && isnumber(object.y)) {
      playerspots.add(pttoindex(object as PT, BOARD_WIDTH))
    }
  }

  // process objects
  for (let i = 0; i < boardobjects.length; ++i) {
    const object = boardobjects[i]
    const collision = memoryreadelementstat(object, 'collision')
    if (ispresent(object.removed) || collision === COLLISION.ISGHOST) {
      continue
    }

    const id = object.id ?? ''
    if (
      ispid(id) === false &&
      isnumber(object.x) &&
      isnumber(object.y) &&
      playerspots.has(pttoindex(object as PT, BOARD_WIDTH)) === true
    ) {
      continue
    }

    const display = memoryreadelementdisplay(object)
    const sprite = memorycreatecachedsprite(boardid, objectindex, id, i)

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = display.char
    sprite.color = display.color
    sprite.bg = display.bg
    sprite.stat = collision
    sprite.pid = ispid(id) ? id : undefined
    objects.sprites.push(sprite)

    // write lighting if needed
    if (isdark) {
      if (display.light > 0) {
        memoryboardlightingapplyobject(
          board,
          lighting.alphas,
          object,
          sprite,
          display.light,
        )
      } else if (ispid(id)) {
        memoryboardlightingmarkplayer(board, lighting.alphas, sprite)
      }
    }
  }

  // process isghost objects
  for (let i = 0; i < boardobjects.length; ++i) {
    const object = boardobjects[i]
    const collision = memoryreadelementstat(object, 'collision')
    if (ispresent(object.removed) || collision !== COLLISION.ISGHOST) {
      continue
    }

    const id = object.id ?? ''
    const display = memoryreadelementdisplay(object)
    const sprite = memorycreatecachedsprite(boardid, objectindex, id, i)

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = display.char
    sprite.color = display.color
    sprite.bg = display.bg
    sprite.stat = collision
    objects.sprites.push(sprite)
  }

  // process ticker messages
  for (let i = 0; i < boardobjects.length; ++i) {
    const object = boardobjects[i]
    // write ticker messages
    if (
      isstring(object.tickertext) &&
      isnumber(object.tickertime) &&
      object.tickertext.length
    ) {
      tickers.push(`${memoryelementtologprefix(object)}${object.tickertext}`)
    }
  }

  // layers for display media
  if (whichlayer === DIR.MID) {
    // set mood
    layers.push(
      createcachedmedia(
        boardid,
        iiii++,
        'text/mood',
        isdark ? 'dark' : 'bright',
      ),
    )

    // check for palette
    if (isstring(board.palettepage)) {
      const codepage = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.PALETTE,
        board.palettepage,
      )
      const palette = memoryreadcodepagedata<CODE_PAGE_TYPE.PALETTE>(codepage)
      if (ispresent(palette?.bits)) {
        layers.push(
          createcachedmedia(
            boardid,
            iiii++,
            'image/palette',
            Array.from(palette.bits),
          ),
        )
      }
    }
    // check for charset
    if (isstring(board.charsetpage)) {
      const codepage = memorypickcodepagewithtypeandstat(
        CODE_PAGE_TYPE.CHARSET,
        board.charsetpage,
      )
      const charset = memoryreadcodepagedata<CODE_PAGE_TYPE.CHARSET>(codepage)
      if (ispresent(charset?.bits)) {
        layers.push(
          createcachedmedia(
            boardid,
            iiii++,
            'image/charset',
            Array.from(charset.bits),
          ),
        )
      }
    }
    // add media layer to list peer ids
    const pids = Object.keys(board.objects).filter(ispid)
    layers.push(
      createcachedmedia(boardid, iiii++, 'text/players', pids.join(',')),
    )
  }

  // return result
  return layers
}

export type MEMORY_GADGET_LAYERS = {
  id: string
  board: string
  exiteast: string
  exitwest: string
  exitnorth: string
  exitsouth: string
  over: LAYER[]
  under: LAYER[]
  layers: LAYER[]
  tickers: string[]
}

export function memorycreatecachedsprite(
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

function memorycreatecachedsprites(
  player: string,
  index: number,
): LAYER_SPRITES {
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

function readgraphics(player: string, board: BOARD) {
  // player flags, then board flags
  const { graphics, camera, facing } = memoryreadflags(player)
  const withgraphics = graphics ?? board.graphics ?? ''
  const withcamera = camera ?? board.camera ?? ''
  const withfacing = facing ?? board.facing ?? ''
  return {
    graphics: withgraphics,
    camera: withcamera,
    facing: withfacing,
  }
}

export function memoryelementtodisplayprefix(element: MAYBE<BOARD_ELEMENT>) {
  const icon = memoryreadelementdisplay(element)
  const color = `${COLOR[icon.color]}`
  const bg = `${COLOR[icon.bg > COLOR.WHITE ? COLOR.BLACK : icon.bg]}`
  return `$${color}$ON${bg}$${icon.char}`
}

export function memoryelementtologprefix(element: MAYBE<BOARD_ELEMENT>) {
  if (!ispresent(element?.id)) {
    return ''
  }

  let withname = memoryreadelementdisplay(element).name
  if (element.kind === 'player') {
    const { user } = memoryreadflags(element.id)
    withname = isstring(user) ? user : 'player'
  }

  const displayprefix = memoryelementtodisplayprefix(element)
  return `${displayprefix}$ONCLEAR$CYAN ${withname}:$WHITE `
}

export function memoryreadgadgetlayers(
  player: string,
  board: MAYBE<BOARD>,
): MEMORY_GADGET_LAYERS {
  const over: LAYER[] = []
  const under: LAYER[] = []
  const layers: LAYER[] = []
  const tickers: string[] = []
  if (!ispresent(board)) {
    return {
      id: '',
      board: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      over,
      under,
      layers,
      tickers,
    }
  }

  // composite id
  const id4all: string[] = [`${board.id}`]

  // read over / under
  const overboard = memoryreadoverboard(board)
  if (overboard?.id) {
    id4all.push(overboard.id)
  }

  const underboard = memoryreadunderboard(board)
  if (underboard?.id) {
    id4all.push(underboard.id)
  }

  // compose layers
  under.push(
    ...memoryconverttogadgetlayers(player, 0, underboard, tickers, DIR.UNDER),
  )
  const multi = ispresent(overboard)
  layers.push(
    ...memoryconverttogadgetlayers(
      player,
      under.length,
      board,
      tickers,
      DIR.MID,
      multi,
    ),
  )
  over.push(
    ...memoryconverttogadgetlayers(
      player,
      under.length + layers.length,
      overboard,
      tickers,
      DIR.OVER,
      multi,
    ),
  )

  // scan for media layers
  const media = layersreadmedia(layers)
  for (let i = 0; i < media.length; ++i) {
    const layer = media[i]
    if (layer.type === LAYER_TYPE.MEDIA) {
      id4all.push(layer.id)
      if (isstring(layer.media)) {
        id4all.push(layer.media)
      }
    }
  }

  return {
    id: id4all.join('|'),
    board: board.id,
    exiteast: memoryreadboardbyaddress(board.exiteast ?? '')?.id ?? '',
    exitwest: memoryreadboardbyaddress(board.exitwest ?? '')?.id ?? '',
    exitnorth: memoryreadboardbyaddress(board.exitnorth ?? '')?.id ?? '',
    exitsouth: memoryreadboardbyaddress(board.exitsouth ?? '')?.id ?? '',
    over,
    under,
    layers,
    tickers,
  }
}

// Rendering & Gadget Conversion Functions

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
