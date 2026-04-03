import { radToDeg } from 'maath/misc'
import { SPRITE } from 'zss/gadget/data/types'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { dirfrompts, isstrdir } from 'zss/words/dir'
import { COLLISION, DIR } from 'zss/words/types'

import { memoryboardelementindex, memoryreadobject } from './boardaccess'
import { memoryevaldir } from './boarddirection'
import { memoryreadelementkind, memoryreadelementstat } from './boards'
import {
  LIGHTING_RAY_TILE_YSCALE,
  lightingmixmaxrange,
  memorylightingaddrangetoblocked,
} from './lightinggeometry'
import { memorycheckcollision } from './spatialqueries'
import { BOARD, BOARD_ELEMENT, BOARD_HEIGHT } from './types'

const LIGHTING_OBJECT_OCCLUSION = 0.27
const LIGHTING_TERRAIN_SOLID_OCCLUSION = 0.11

/** Cell center to cell center in width-normalized space (Y × `LIGHTING_RAY_TILE_YSCALE`). */
const lightingraypt = { x: 0, y: 0 }

/** Map to signed degrees consistent with `lightingrayshade` / wedge ranges (≈ (−180, 180]). */
function lightingcanonheadingdeg(deg: number): number {
  let x = Math.round(deg) % 360
  if (x > 180) {
    x -= 360
  }
  if (x <= -180) {
    x += 360
  }
  return x
}

function lightingheadinginblocked(
  heading: number,
  minangle: number,
  maxangle: number,
): boolean {
  if (minangle > maxangle) {
    return heading >= minangle || heading <= maxangle
  }
  return heading >= minangle && heading <= maxangle
}

/** True if center or ±1° (wrapped) lies in the sector — closes single-degree leaks (e.g. vertical streaks). */
function lightingraysamplehitsblocked(
  baserounded: number,
  minangle: number,
  maxangle: number,
): boolean {
  for (let d = -1; d <= 1; d++) {
    const h = lightingcanonheadingdeg(baserounded + d)
    if (lightingheadinginblocked(h, minangle, maxangle)) {
      return true
    }
  }
  return false
}

type LightingRingOcclusion = {
  x: number
  y: number
  range: [number, number, number]
}

function lightingforeachchebyshevingcell(
  sx: number,
  sy: number,
  r: number,
  fn: (x: number, y: number) => void,
) {
  for (let x = sx - r; x <= sx + r; x++) {
    fn(x, sy - r)
  }
  for (let y = sy - r + 1; y <= sy + r - 1; y++) {
    fn(sx + r, y)
  }
  for (let x = sx + r; x >= sx - r; x--) {
    fn(x, sy + r)
  }
  for (let y = sy + r - 1; y >= sy - r + 1; y--) {
    fn(sx - r, y)
  }
}

function lightingappendringocclusions(
  board: BOARD,
  lookup: BOARD['lookup'],
  sprite: SPRITE,
  radius: number,
  x: number,
  y: number,
  ringout: LightingRingOcclusion[],
) {
  const pt = { x, y }
  const idx = memoryboardelementindex(board, pt)
  if (idx === -1) {
    return
  }

  lightingraypt.x = x - sprite.x
  lightingraypt.y = (y - sprite.y) * LIGHTING_RAY_TILE_YSCALE
  if (Math.hypot(lightingraypt.x, lightingraypt.y) > radius) {
    return
  }

  const object = memoryreadobject(board, lookup?.[idx] ?? '')
  if (ispresent(object)) {
    ringout.push({
      x,
      y,
      range: [
        ...lightingmixmaxrange(sprite, pt, 'object'),
        LIGHTING_OBJECT_OCCLUSION,
      ],
    })
  }

  const maybeterrain = board.terrain[idx]
  const terrainkind = memoryreadelementkind(maybeterrain)
  const terraincollision = maybeterrain?.collision ?? terrainkind?.collision
  if (memorycheckcollision(COLLISION.ISBULLET, terraincollision)) {
    ringout.push({
      x,
      y,
      range: [
        ...lightingmixmaxrange(sprite, pt),
        LIGHTING_TERRAIN_SOLID_OCCLUSION,
      ],
    })
  }
}

function lightingrayshade(
  board: BOARD,
  alphas: number[],
  blocked: [number, number, number][],
  ringocclusions: LightingRingOcclusion[],
  selfx: number,
  selfy: number,
  sprite: SPRITE,
  radius: number,
  falloff: number,
  x: number,
  y: number,
) {
  const pt = { x, y }
  const idx = memoryboardelementindex(board, pt)
  if (idx === -1) {
    return
  }

  lightingraypt.x = x - sprite.x
  lightingraypt.y = (y - sprite.y) * LIGHTING_RAY_TILE_YSCALE
  const raydist = Math.hypot(lightingraypt.x, lightingraypt.y)
  if (raydist > radius) {
    return
  }

  const angle = Math.round(
    radToDeg(Math.atan2(lightingraypt.y, lightingraypt.x)),
  )

  let current = 0
  for (let b = 0; b < blocked.length; ++b) {
    const [minangle, maxangle, value] = blocked[b]
    if (lightingraysamplehitsblocked(angle, minangle, maxangle)) {
      current += value
    }
  }

  for (let o = 0; o < ringocclusions.length; ++o) {
    const oc = ringocclusions[o]
    if (oc.x === selfx && oc.y === selfy) {
      continue
    }
    const [minangle, maxangle, value] = oc.range
    if (lightingraysamplehitsblocked(angle, minangle, maxangle)) {
      current += value
    }
  }

  const hradius = radius * 0.5
  const falloffterm = raydist < hradius ? 0 : (raydist - hradius) * falloff
  alphas[idx] = Math.min(alphas[idx], Math.min(1, current + falloffterm))
  alphas[idx] = clamp(alphas[idx], 0, 1)
}

/**
 * Apply a light-emitting object to the dither `alphas` buffer (dark boards only).
 */
export function memoryboardlightingapplyobject(
  board: BOARD,
  alphas: number[],
  object: BOARD_ELEMENT,
  sprite: SPRITE,
  light: number,
) {
  const center = memoryboardelementindex(board, sprite)
  const radius = clamp(Math.round(light), 1, BOARD_HEIGHT)
  const step = 1 / (radius * 0.5)

  alphas[center] = 0
  if (radius <= 1) {
    return
  }

  const lookup = board.lookup
  const blocked: [number, number, number][] = []
  const ringocclusions: LightingRingOcclusion[] = []

  for (let r = 1; r <= radius; ++r) {
    if (r === 1) {
      const maybedir = memoryreadelementstat(object, 'lightdir')
      if (isstrdir(maybedir)) {
        const lightdir = memoryevaldir(board, object, '', maybedir, sprite)
        switch (dirfrompts(sprite, lightdir.destpt)) {
          case DIR.EAST:
            blocked.push([45, 315, LIGHTING_TERRAIN_SOLID_OCCLUSION])
            break
          case DIR.WEST:
            blocked.push([225, 135, LIGHTING_TERRAIN_SOLID_OCCLUSION])
            break
          case DIR.NORTH:
            blocked.push([315, 225, LIGHTING_TERRAIN_SOLID_OCCLUSION])
            break
          case DIR.SOUTH:
            blocked.push([135, 45, LIGHTING_TERRAIN_SOLID_OCCLUSION])
            break
        }
      }
    }
    ringocclusions.length = 0
    lightingforeachchebyshevingcell(sprite.x, sprite.y, r, (x, y) => {
      lightingappendringocclusions(
        board,
        lookup,
        sprite,
        radius,
        x,
        y,
        ringocclusions,
      )
    })
    lightingforeachchebyshevingcell(sprite.x, sprite.y, r, (x, y) => {
      lightingrayshade(
        board,
        alphas,
        blocked,
        ringocclusions,
        x,
        y,
        sprite,
        radius,
        step,
        x,
        y,
      )
    })
    for (let o = 0; o < ringocclusions.length; ++o) {
      memorylightingaddrangetoblocked(blocked, ringocclusions[o].range)
    }
  }
}

/** Full-bright cell for the local player on dark boards when they carry no light. */
export function memoryboardlightingmarkplayer(
  board: BOARD,
  alphas: number[],
  sprite: SPRITE,
) {
  const sx = sprite.x
  const sy = sprite.y
  for (let y = sy - 1; y <= sy + 1; y++) {
    for (let x = sx - 1; x <= sx + 1; x++) {
      const index = memoryboardelementindex(board, { x, y })
      if (index !== -1) {
        const iscenter = x === sx && y === sy
        const isaligned = x === sx || y === sy
        const lit = iscenter ? 0 : isaligned ? 0.7 : 0.9
        alphas[index] = Math.min(alphas[index], lit)
      }
    }
  }
}
