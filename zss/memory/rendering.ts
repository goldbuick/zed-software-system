import { PERF_INCREMENTAL_LAYERS } from 'zss/config'
import {
  LAYER,
  LAYER_CONTROL,
  LAYER_DITHER,
  LAYER_MEDIA,
  LAYER_SPRITES,
  LAYER_TILES,
  LAYER_TYPE,
  SPRITE,
  TICKER,
  VIEWSCALE,
  createcontrol,
  createdither,
  createmedia,
  createsprite,
  createsprites,
  createtiles,
  layersreadmedia,
} from 'zss/gadget/data/types'
import { normalizelayerzvariant } from 'zss/gadget/graphics/layerz'
import { pttoindex } from 'zss/mapping/2d'
import { ispid } from 'zss/mapping/guid'
import { MAYBE, isnumber, ispresent, isstring } from 'zss/mapping/types'
import { measurestage } from 'zss/perf/ticktimingstats'
import { COLLISION, COLOR, DIR, NAME, PT } from 'zss/words/types'

import { memoryreadelement } from './boardaccess'
import { memorycornerexitboardids } from './boardcornerexits'
import { memorydepth2exitboardids } from './boarddepth2exits'
import {
  memoryboardlightingapplyobject,
  memoryboardlightingmarkplayer,
} from './boardlighting'
import { memoryensureboardready } from './boardlookup'
import {
  memoryreadboardbyaddress,
  memoryreadelementkind,
  memoryreadelementstat,
  memoryreadoverboard,
  memoryreadunderboard,
} from './boards'
import { memoryupdateboardvisuals } from './boardvisuals'
import { memoryreadelementdisplay, memoryreadflags } from './bookoperations'
import {
  memoryreadcodepagedata,
  memoryreadcodepagename,
  memoryreadcodepagetype,
} from './codepageoperations'
import { memorypickcodepage } from './codepages'
import { memoryreadbooklist, memoryreadmainbook } from './session'
import {
  BOARD,
  BOARD_ELEMENT,
  BOARD_HEIGHT,
  BOARD_SIZE,
  BOARD_WIDTH,
  CODE_PAGE,
  CODE_PAGE_TYPE,
} from './types'

/** Board-size number[] pool + keyed LAYER/SPRITE cache (memory-internal). */
const MAX_POOLED_BOARD_ARRAYS = 128
const BOARD_ARRAY_POOL: number[][] = []

function acquireboardsizearray(fill: number): number[] {
  const arr = BOARD_ARRAY_POOL.pop()
  if (ispresent(arr) && arr.length === BOARD_SIZE) {
    arr.fill(fill)
    return arr
  }
  return new Array(BOARD_SIZE).fill(fill)
}

function releaseboardsizearray(arr: MAYBE<number[]>) {
  if (!ispresent(arr) || arr.length !== BOARD_SIZE) {
    return
  }
  if (BOARD_ARRAY_POOL.length >= MAX_POOLED_BOARD_ARRAYS) {
    return
  }
  BOARD_ARRAY_POOL.push(arr)
}

const MAX_LAYER_AND_SPRITE_CACHE = 512
const LAYER_CACHE: Record<string, LAYER> = {}
const SPRITE_CACHE: Record<string, SPRITE> = {}
const CACHE_EVICTION_ORDER: string[] = []

function releaselayerbackingarrays(layer: LAYER) {
  if (layer.type === LAYER_TYPE.TILES) {
    releaseboardsizearray(layer.char)
    releaseboardsizearray(layer.color)
    releaseboardsizearray(layer.bg)
    releaseboardsizearray(layer.props)
    return
  }
  if (layer.type === LAYER_TYPE.DITHER) {
    releaseboardsizearray(layer.alphas)
  }
}

function evictrendercacheifneeded() {
  while (CACHE_EVICTION_ORDER.length > MAX_LAYER_AND_SPRITE_CACHE) {
    const tag = CACHE_EVICTION_ORDER.shift()
    if (!ispresent(tag)) {
      break
    }
    if (tag.startsWith('L')) {
      const id = tag.slice(2)
      const layer = LAYER_CACHE[id]
      if (ispresent(layer)) {
        releaselayerbackingarrays(layer)
      }
      delete LAYER_CACHE[id]
    } else {
      delete SPRITE_CACHE[tag.slice(2)]
    }
  }
}

function registernewlayercacheid(id: string) {
  CACHE_EVICTION_ORDER.push(`L:${id}`)
  evictrendercacheifneeded()
}

function registernewspritecacheid(id: string) {
  CACHE_EVICTION_ORDER.push(`S:${id}`)
  evictrendercacheifneeded()
}

function createtileswithpooledbuffers(
  player: string,
  index: number,
  width: number,
  height: number,
  bg = 0,
): LAYER_TILES {
  const size = width * height
  if (size !== BOARD_SIZE) {
    return createtiles(player, index, width, height, bg)
  }
  return {
    id: `t:${player}:${index}`,
    type: LAYER_TYPE.TILES,
    width,
    height,
    char: acquireboardsizearray(0),
    color: acquireboardsizearray(0),
    bg: acquireboardsizearray(bg),
    props: acquireboardsizearray(0),
  }
}

function createditherwithpooledbuffer(
  player: string,
  index: number,
  width: number,
  height: number,
  fill = 0,
): LAYER_DITHER {
  const size = width * height
  if (size !== BOARD_SIZE) {
    return createdither(player, index, width, height, fill)
  }
  return {
    id: `d:${player}:${index}`,
    type: LAYER_TYPE.DITHER,
    width,
    height,
    alphas: acquireboardsizearray(fill),
  }
}

function memorycreatecachedsprite(
  player: string,
  index: number,
  id: string,
  spriteindex: number,
): SPRITE {
  const uid = `sprites:${player}:${index}:${id}`
  const cid = `sprite:${player}:${index}:${spriteindex}`
  if (!ispresent(SPRITE_CACHE[cid])) {
    SPRITE_CACHE[cid] = createsprite(player, index, id)
    registernewspritecacheid(cid)
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
    registernewlayercacheid(id)
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
    LAYER_CACHE[id] = createditherwithpooledbuffer(
      player,
      index,
      width,
      height,
      fill,
    )
    registernewlayercacheid(id)
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
    registernewlayercacheid(id)
  }
  const layermedia = LAYER_CACHE[id] as LAYER_MEDIA
  layermedia.mime = mime
  layermedia.media = media
  return layermedia
}

function createcachedcontrol(player: string, index: number): LAYER_CONTROL {
  const id = `control:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createcontrol(player, index)
    registernewlayercacheid(id)
  }
  return LAYER_CACHE[id] as LAYER_CONTROL
}

function createcachedtiles(
  player: string,
  index: number,
  width: number,
  height: number,
  bg = 0,
): LAYER_TILES {
  const id = `tiles:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createtileswithpooledbuffers(
      player,
      index,
      width,
      height,
      bg,
    )
    registernewlayercacheid(id)
  }
  return LAYER_CACHE[id] as LAYER_TILES
}

/**
 * Gadget rendering: board → layer stacks, display prefixes, and a small LRU
 * for palette/charset bit fingerprints (`cachedmediabits`). Layer identity and
 * backing buffers use an in-file board-size array pool + layer cache.
 */

/** Dedupes identical palette/charset bit payloads; small LRU by key. */
const MAX_MEDIABITS_CACHE = 48
const MEDIABITS_CACHE = new Map<string, number[]>()
const MEDIABITS_CACHE_ORDER: string[] = []

function fingerprintbits(bits: ArrayLike<number>): string {
  const len = bits.length
  if (len === 0) {
    return '0'
  }
  let h = len | 0
  h = (h * 31 + bits[0]) | 0
  h = (h * 31 + bits[len - 1]) | 0
  h = (h * 31 + bits[(len / 2) | 0]) | 0
  return `${len}:${h}`
}

function mediabitscachetouch(key: string) {
  const at = MEDIABITS_CACHE_ORDER.indexOf(key)
  if (at >= 0) {
    MEDIABITS_CACHE_ORDER.splice(at, 1)
  }
  MEDIABITS_CACHE_ORDER.push(key)
  while (MEDIABITS_CACHE_ORDER.length > MAX_MEDIABITS_CACHE) {
    const ev = MEDIABITS_CACHE_ORDER.shift()
    if (ispresent(ev)) {
      MEDIABITS_CACHE.delete(ev)
    }
  }
}

function cachedmediabits(
  pageselect: string,
  bits: ArrayLike<number>,
): number[] {
  const key = `${pageselect}:${fingerprintbits(bits)}`
  const got = MEDIABITS_CACHE.get(key)
  if (ispresent(got) && got.length === bits.length) {
    let ok = true
    for (let i = 0; i < bits.length; i++) {
      if (got[i] !== bits[i]) {
        ok = false
        break
      }
    }
    if (ok) {
      mediabitscachetouch(key)
      return got
    }
  }
  const copy = Array.from(bits)
  MEDIABITS_CACHE.set(key, copy)
  mediabitscachetouch(key)
  return copy
}

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
  const maybeobject = memoryreadelement(board, player, { layer: 'object' })
  if (!ispresent(board) || !ispresent(maybeobject)) {
    return []
  }

  // setup focus
  control.focusid = maybeobject.id ?? ''
  control.focusx = maybeobject.x ?? 0
  control.focusy = maybeobject.y ?? 0

  // player flags, then board flags
  const { graphics, camera, facing } = memoryreadgraphics(player, board)
  if (isstring(graphics)) {
    control.graphics = normalizelayerzvariant(graphics)
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
    control.facing = (facing * Math.PI) / 180
  }

  return [control]
}

/**
 * Cache of last-built layer wrappers per (graphics, board, whichlayer, index).
 * When `PERF_INCREMENTAL_LAYERS` is enabled and `boardruntime.drawneedfull`
 * is false AND `drawallowids` is empty AND `drawdirtycells` is empty,
 * returning the cached array reuses the already-populated tile/sprite/dither
 * buffers (their identities are stable thanks to `createcachedtiles` /
 * `memorycreatecachedsprites`).
 *
 * Empty `drawallowids` alone is not enough: player movement updates
 * fingerprints and `drawdirtycells` without `:drawdisplay` allow entries.
 *
 * NOTE: a deeper incremental rebuild that touches only the cells in
 * `drawallowids` is the eventual goal; this cache is a conservative
 * stepping stone, gated so it is trivially disabled when needed.
 */
const memoryconverttogadgetlayerscache = new Map<string, LAYER[]>()

/** Drop incremental MID/UNDER/OVER cache rows for a board (media bind, palette, etc.). */
export function memoryinvalidategadgetlayerscacheforboard(boardid: string) {
  const trimmed = boardid.trim()
  if (!trimmed) {
    return
  }
  const needle = `:${trimmed}:`
  for (const key of memoryconverttogadgetlayerscache.keys()) {
    if (key.includes(needle)) {
      memoryconverttogadgetlayerscache.delete(key)
    }
  }
}

/** Gate for incremental layer cache reuse; exported for unit tests. */
export function memoryincrementallayerscachestable(
  boardruntime: MAYBE<{
    drawneedfull?: boolean
    drawallowids?: Set<string>
    drawdirtycells?: number[]
  }>,
): boolean {
  if (!boardruntime || boardruntime.drawneedfull) {
    return false
  }
  const allowids = boardruntime.drawallowids
  if (!ispresent(allowids) || allowids.size !== 0) {
    return false
  }
  const dirtycells = boardruntime.drawdirtycells
  return !dirtycells || dirtycells.length === 0
}

function memoryattachdrawdirtycellstotiles(board: BOARD, tiles: LAYER_TILES) {
  // PERF_TILE_SUBIMAGE path: zss/perf/docs/render-gadget-optimizations.md
  if (board.drawneedfull) {
    delete tiles.dirtycells
    return
  }
  const dirty = board.drawdirtycells
  if (dirty?.length) {
    tiles.dirtycells = dirty
  } else {
    delete tiles.dirtycells
  }
}

/** Append live object ticker strips for a board. Kept outside layer cache. */
export function memoryappendboardtickers(
  board: MAYBE<BOARD>,
  tickers: TICKER[],
): void {
  if (!ispresent(board?.objects)) {
    return
  }
  const boardobjects = Object.values(board.objects)
  for (let i = 0; i < boardobjects.length; ++i) {
    const object = boardobjects[i]
    if (
      isstring(object.tickertext) &&
      isnumber(object.tickertime) &&
      object.tickertext.length &&
      isstring(object.id)
    ) {
      tickers.push({
        id: object.id,
        text: `${memoryelementtotickerprefix(object)}${object.tickertext}`,
        tickertime: object.tickertime,
      })
    }
  }
}

export function memoryconverttogadgetlayers(
  graphics: string,
  index: number,
  board: MAYBE<BOARD>,
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

  if (PERF_INCREMENTAL_LAYERS) {
    const stable = memoryincrementallayerscachestable(board)
    if (stable) {
      const cachekey = `${graphics}:${board.id}:${whichlayer}:${index}`
      const cached = memoryconverttogadgetlayerscache.get(cachekey)
      if (cached) {
        const tilelayer = cached.find(
          (layer) => layer.type === LAYER_TYPE.TILES,
        )
        if (tilelayer?.type === LAYER_TYPE.TILES) {
          memoryattachdrawdirtycellstotiles(board, tilelayer)
        }
        return cached
      }
    }
  }

  // make sure named index is created (tick path already ensured; lazy if other callers)
  memoryensureboardready(board)

  // update resolve caches
  memoryupdateboardvisuals(board)

  const withgraphics = normalizelayerzvariant(graphics)
  const layers: LAYER[] = []

  let iiii = index
  const boardid = board.id
  const cacheowner = `${withgraphics}:${boardid}`
  const boardwidth = BOARD_WIDTH
  const boardheight = BOARD_HEIGHT
  const tiles = createcachedtiles(
    cacheowner,
    iiii++,
    boardwidth,
    boardheight,
    COLOR.BLACK,
  )
  layers.push(tiles)
  memoryattachdrawdirtycellstotiles(board, tiles)

  const objectindex = iiii++
  const objects = memorycreatecachedsprites(cacheowner, objectindex)
  objects.sprites = []
  layers.push(objects)

  const isdark = board.isdark ? 1 : 0
  const lighting = createcacheddither(
    cacheowner,
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
    tiles.props[i] = collision
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
    const sprite = memorycreatecachedsprite(cacheowner, objectindex, id, i)

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
    const sprite = memorycreatecachedsprite(cacheowner, objectindex, id, i)

    // setup sprite
    sprite.x = object.x ?? 0
    sprite.y = object.y ?? 0
    sprite.char = display.char
    sprite.color = display.color
    sprite.bg = display.bg
    sprite.stat = collision
    objects.sprites.push(sprite)
  }

  // layers for display media
  if (whichlayer === DIR.MID) {
    // set mood
    layers.push(
      createcachedmedia(
        cacheowner,
        iiii++,
        'text/mood',
        isdark ? 'dark' : 'bright',
      ),
    )

    // check for palette
    if (isstring(board.palettepage)) {
      const codepage = memorypickcodepage(
        memoryreadbooklist(),
        CODE_PAGE_TYPE.PALETTE,
        board.palettepage,
      )
      const palette = memoryreadcodepagedata<CODE_PAGE_TYPE.PALETTE>(codepage)
      if (ispresent(palette?.bits)) {
        layers.push(
          createcachedmedia(
            cacheowner,
            iiii++,
            'image/palette',
            cachedmediabits(board.palettepage, palette.bits),
          ),
        )
      }
    }
    // check for charset
    if (isstring(board.charsetpage)) {
      const codepage = memorypickcodepage(
        memoryreadbooklist(),
        CODE_PAGE_TYPE.CHARSET,
        board.charsetpage,
      )
      const charset = memoryreadcodepagedata<CODE_PAGE_TYPE.CHARSET>(codepage)
      if (ispresent(charset?.bits)) {
        layers.push(
          createcachedmedia(
            cacheowner,
            iiii++,
            'image/charset',
            cachedmediabits(board.charsetpage, charset.bits),
          ),
        )
      }
    }
    if (isstring(board.mediaqueuehelperpeerid)) {
      layers.push(
        createcachedmedia(
          cacheowner,
          iiii++,
          'text/mediaqueue-helper',
          board.mediaqueuehelperpeerid,
        ),
      )
    }
    if (isstring(board.mediaqueuenowplayingtitle)) {
      layers.push(
        createcachedmedia(
          cacheowner,
          iiii++,
          'text/mediaqueue-nowplaying',
          board.mediaqueuenowplayingtitle,
        ),
      )
    }
    // add media layer to list peer ids
    const pids = Object.keys(board.objects).filter(ispid)
    layers.push(
      createcachedmedia(cacheowner, iiii++, 'text/players', pids.join(',')),
    )
  }

  if (PERF_INCREMENTAL_LAYERS) {
    const cachekey = `${graphics}:${board.id}:${whichlayer}:${index}`
    memoryconverttogadgetlayerscache.set(cachekey, layers)
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
  exiteast2: string
  exitwest2: string
  exitnorth2: string
  exitsouth2: string
  exitne: string
  exitnw: string
  exitse: string
  exitsw: string
  over: LAYER[]
  under: LAYER[]
  layers: LAYER[]
  tickers: TICKER[]
}

export function memoryreadgraphics(player: string, board: BOARD) {
  // player flags, then board flags
  const { graphics, camera, facing } = memoryreadflags(
    memoryreadmainbook(),
    player,
  )
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
    const { user } = memoryreadflags(memoryreadmainbook(), element.id)
    withname = isstring(user) ? user : 'player'
  }

  const displayprefix = memoryelementtodisplayprefix(element)
  return `${displayprefix}$ONCLEAR$CYAN ${withname}:$WHITE `
}

/** Ticker strip prefix only; uses @displayname when set (element then kind). */
export function memoryelementtotickerprefix(element: MAYBE<BOARD_ELEMENT>) {
  if (!ispresent(element?.id)) {
    return ''
  }

  let withname: string
  if (element.kind === 'player') {
    const { user } = memoryreadflags(memoryreadmainbook(), element.id)
    withname = isstring(user) ? user : 'player'
  } else {
    memoryreadelementkind(element)
    const kind = element.kinddata
    const fromdisplay = element.displayname ?? kind?.displayname
    const trimmed =
      isstring(fromdisplay) && fromdisplay.trim().length > 0
        ? NAME(fromdisplay)
        : ''
    withname =
      trimmed.length > 0 ? trimmed : memoryreadelementdisplay(element).name
  }

  const displayprefix = memoryelementtodisplayprefix(element)
  return `${displayprefix}$ONCLEAR$CYAN ${withname}:$WHITE `
}

export function memoryreadgadgetlayers(
  graphics: string,
  board: MAYBE<BOARD>,
): MEMORY_GADGET_LAYERS {
  return measurestage('tick:readgadgetlayers', () =>
    memoryreadgadgetlayersbody(graphics, board),
  )
}

function memoryreadgadgetlayersbody(
  graphics: string,
  board: MAYBE<BOARD>,
): MEMORY_GADGET_LAYERS {
  const over: LAYER[] = []
  const under: LAYER[] = []
  const layers: LAYER[] = []
  const tickers: TICKER[] = []
  if (!ispresent(board)) {
    return {
      id: '',
      board: '',
      exiteast: '',
      exitwest: '',
      exitnorth: '',
      exitsouth: '',
      exiteast2: '',
      exitwest2: '',
      exitnorth2: '',
      exitsouth2: '',
      exitne: '',
      exitnw: '',
      exitse: '',
      exitsw: '',
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

  // compose layers (tickers collected separately so layer cache hits cannot drop them)
  under.push(...memoryconverttogadgetlayers(graphics, 0, underboard, DIR.UNDER))
  const multi = ispresent(overboard)
  layers.push(
    ...memoryconverttogadgetlayers(
      graphics,
      under.length,
      board,
      DIR.MID,
      multi,
    ),
  )
  over.push(
    ...memoryconverttogadgetlayers(
      graphics,
      under.length + layers.length,
      overboard,
      DIR.OVER,
      multi,
    ),
  )
  memoryappendboardtickers(underboard, tickers)
  memoryappendboardtickers(board, tickers)
  memoryappendboardtickers(overboard, tickers)

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

  const corners = memorycornerexitboardids(board)
  const depth2 = memorydepth2exitboardids(board)
  return {
    id: id4all.join('|'),
    board: board.id,
    exiteast: memoryreadboardbyaddress(board.exiteast ?? '')?.id ?? '',
    exitwest: memoryreadboardbyaddress(board.exitwest ?? '')?.id ?? '',
    exitnorth: memoryreadboardbyaddress(board.exitnorth ?? '')?.id ?? '',
    exitsouth: memoryreadboardbyaddress(board.exitsouth ?? '')?.id ?? '',
    exiteast2: depth2.exiteast2,
    exitwest2: depth2.exitwest2,
    exitnorth2: depth2.exitnorth2,
    exitsouth2: depth2.exitsouth2,
    exitne: corners.exitne,
    exitnw: corners.exitnw,
    exitse: corners.exitse,
    exitsw: corners.exitsw,
    over,
    under,
    layers,
    tickers,
  }
}
