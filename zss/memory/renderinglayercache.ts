import {
  LAYER,
  LAYER_CONTROL,
  LAYER_DITHER,
  LAYER_MEDIA,
  LAYER_SPRITES,
  LAYER_TILES,
  LAYER_TYPE,
  SPRITE,
  createcontrol,
  createdither,
  createmedia,
  createsprite,
  createsprites,
  createtiles,
} from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'
import {
  acquireboardsizearray,
  releaseboardsizearray,
} from 'zss/memory/boardarraypool'
import { BOARD_SIZE } from 'zss/memory/types'

/**
 * Keyed reuse of gadget `LAYER` / `SPRITE` instances (player + board + slot).
 * Large numeric backing stores for tiles and dither come from `boardarraypool`
 * on first create; eviction returns those arrays to the pool (see
 * `evictrendercacheifneeded`).
 */

const MAX_LAYER_AND_SPRITE_CACHE = 512
const LAYER_CACHE: Record<string, LAYER> = {}
const SPRITE_CACHE: Record<string, SPRITE> = {}
const CACHE_EVICTION_ORDER: string[] = []

function releaselayerbackingarrays(layer: LAYER) {
  if (layer.type === LAYER_TYPE.TILES) {
    releaseboardsizearray(layer.char)
    releaseboardsizearray(layer.color)
    releaseboardsizearray(layer.bg)
    releaseboardsizearray(layer.stats)
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
    stats: acquireboardsizearray(0),
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
    registernewspritecacheid(cid)
  }
  SPRITE_CACHE[cid].id = uid
  return SPRITE_CACHE[cid]
}

export function memorycreatecachedsprites(
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

export function createcacheddither(
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

export function createcachedmedia(
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

export function createcachedcontrol(
  player: string,
  index: number,
): LAYER_CONTROL {
  const id = `control:${player}:${index}`
  if (!ispresent(LAYER_CACHE[id])) {
    LAYER_CACHE[id] = createcontrol(player, index)
    registernewlayercacheid(id)
  }
  return LAYER_CACHE[id] as LAYER_CONTROL
}

export function createcachedtiles(
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
