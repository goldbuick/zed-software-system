import type { Camera, Object3D } from 'three'
import { Vector3 } from 'three'
import type {
  TICKER_ANCHOR,
  TICKER_SLOT,
} from 'zss/gadget/data/tickerlayoutstore'
import { useTickerLayout } from 'zss/gadget/data/tickerlayoutstore'
import type { LAYER, SPRITE, TICKER } from 'zss/gadget/data/types'
import { LAYER_TYPE } from 'zss/gadget/data/types'
import { ispresent } from 'zss/mapping/types'

const scratch = new Vector3()

/** Board-cell local position matching sprite shader world pos. */
export function tickerboardcelllocal(
  boardx: number,
  boardy: number,
  boardz: number,
  drawwidth: number,
  drawheight: number,
  out = scratch,
): Vector3 {
  // sprites.ts: animPosition *= pointSize; += pointSize*0.5; animPosition.x -= 1.0
  return out.set(
    (boardx + 0.5) * drawwidth - 1,
    (boardy + 0.5) * drawheight,
    boardz,
  )
}

/**
 * Project a board-local point through `boardgroup` + `camera` into overlay
 * tile coords (y=0 at top of the ticker overlay buffer).
 *
 * Returns left-edge continuous tile coords: an integer N is the left edge of
 * column N, and N+0.5 is that column's center. Use tickertileat() to pick the
 * column whose center should host a glyph (tail / bubble anchor).
 */
export function tickerprojectlocaltoscreentile(
  boardgroup: Object3D,
  camera: Camera,
  local: Vector3,
  cols: number,
  rows: number,
): TICKER_ANCHOR {
  boardgroup.localToWorld(local)
  local.project(camera)
  const ndcx = local.x
  const ndcy = local.y
  const ndcz = local.z
  const sx = (ndcx * 0.5 + 0.5) * cols
  const sy = (ndcy * 0.5 + 0.5) * rows
  const visible =
    ndcz >= -1 && ndcz <= 1 && sx >= -1 && sx <= cols && sy >= -1 && sy <= rows
  return { sx, sy, visible }
}

/**
 * Overlay column containing a left-edge continuous tile coord.
 * Column N covers [N, N+1); its glyph center is at N+0.5.
 */
export function tickertileat(continuous: number): number {
  return Math.floor(continuous)
}

/** Find sprite board coords for a ticker id in SPRITES layers. */
export function tickerfindspritexy(
  layers: LAYER[],
  id: string,
): { x: number; y: number } | undefined {
  const idsuffix = `:${id}`
  for (let i = 0; i < layers.length; ++i) {
    const layer = layers[i]
    if (layer.type !== LAYER_TYPE.SPRITES) {
      continue
    }
    const sprites: SPRITE[] = layer.sprites
    for (let s = 0; s < sprites.length; ++s) {
      const sprite = sprites[s]
      // players use pid; objects use composite sprite.id ending in :objectid
      if (
        sprite.pid === id ||
        sprite.id === id ||
        sprite.id.endsWith(idsuffix)
      ) {
        return { x: sprite.x, y: sprite.y }
      }
    }
  }
  return undefined
}

export function tickerpublishfromtickers(args: {
  tickers: TICKER[]
  layers: LAYER[]
  boardgroup: Object3D
  camera: Camera
  drawwidth: number
  drawheight: number
  cols: number
  rows: number
  boardz?: number
}) {
  const {
    tickers,
    layers,
    boardgroup,
    camera,
    drawwidth,
    drawheight,
    cols,
    rows,
    boardz = 0,
  } = args

  boardgroup.updateMatrixWorld(true)

  if (tickers.length === 0) {
    useTickerLayout.getState().setanchors({}, [])
    return
  }

  const next: Record<string, TICKER_ANCHOR> = {}
  const local = new Vector3()
  for (let i = 0; i < tickers.length; ++i) {
    const ticker = tickers[i]
    const xy = tickerfindspritexy(layers, ticker.id)
    if (!xy) {
      next[ticker.id] = { sx: 0, sy: 0, visible: false }
      continue
    }
    tickerboardcelllocal(xy.x, xy.y, boardz, drawwidth, drawheight, local)
    const anchor = tickerprojectlocaltoscreentile(
      boardgroup,
      camera,
      local,
      cols,
      rows,
    )
    // quantize to stabilize layout against camera damping noise
    next[ticker.id] = {
      sx: Math.round(anchor.sx * 4) / 4,
      sy: Math.round(anchor.sy * 4) / 4,
      visible: anchor.visible,
    }
  }

  const playertiles: TICKER_SLOT[] = []
  const seenplayers = new Set<string>()
  for (let i = 0; i < layers.length; ++i) {
    const layer = layers[i]
    if (layer.type !== LAYER_TYPE.SPRITES) {
      continue
    }
    const sprites: SPRITE[] = layer.sprites
    for (let s = 0; s < sprites.length; ++s) {
      const sprite = sprites[s]
      if (!ispresent(sprite.pid)) {
        continue
      }
      tickerboardcelllocal(
        sprite.x,
        sprite.y,
        boardz,
        drawwidth,
        drawheight,
        local,
      )
      const projected = tickerprojectlocaltoscreentile(
        boardgroup,
        camera,
        local,
        cols,
        rows,
      )
      if (!projected.visible) {
        continue
      }
      const qx = Math.round(projected.sx * 4) / 4
      const qy = Math.round(projected.sy * 4) / 4
      const tilex = tickertileat(qx)
      const tiley = tickertileat(qy)
      const key = `${tilex},${tiley}`
      if (seenplayers.has(key)) {
        continue
      }
      seenplayers.add(key)
      playertiles.push({ tilex, tiley })
    }
  }

  useTickerLayout.getState().setanchors(next, playertiles)
}
