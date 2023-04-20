import * as THREE from 'three'

import { TILE_SIZE } from './tiles'
/*

the goal of this is to render an entire set of chars with a single quad

What data do we need? which char, what color ?

an array of colors

r = x
g = y
b = color index
a = ?

*/

type TILE_CODES = (number | null | undefined)[]
type TILE_COLORS = (number | undefined)[]

const BOTTOM_LEFT = [0, 1, 0]
const BOTTOM_RIGHT = [1, 1, 0]
const TOP_RIGHT = [1, 0, 0]
const TOP_LEFT = [0, 0, 0]

const QUAD_POSITIONS = new Float32Array([
  ...BOTTOM_LEFT,
  ...TOP_RIGHT,
  ...BOTTOM_RIGHT,
  ...BOTTOM_LEFT,
  ...TOP_LEFT,
  ...TOP_RIGHT,
])

const QUAD_UVS = new Float32Array([
  ...BOTTOM_LEFT.slice(0, 2),
  ...TOP_RIGHT.slice(0, 2),
  ...BOTTOM_RIGHT.slice(0, 2),
  ...BOTTOM_LEFT.slice(0, 2),
  ...TOP_LEFT.slice(0, 2),
  ...TOP_RIGHT.slice(0, 2),
])

// imageWidth: number,
// imageHeight: number,
// tcodes: TILE_CODES,
// tcolors: TILE_COLORS,
// TILE_IMAGE_SIZE

export function createTilemapLookup(
  width: number,
  height: number,
  tcodes: TILE_CODES,
  tcolors: TILE_COLORS,
) {
  //
}

export function updateTilemapLookup(
  width: number,
  height: number,
  tcodes: TILE_CODES,
  tcolors: TILE_COLORS,
) {
  //
}

export function createTilemapQuad(
  bg: THREE.BufferGeometry,
  width: number,
  height: number,
) {
  const right = width * TILE_SIZE
  const bottom = height * TILE_SIZE
  const positions = QUAD_POSITIONS.map((v, index) => {
    switch (index % 3) {
      case 0:
        return v * right
      case 1:
        return v * bottom
      default:
        return v
    }
  })

  bg.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  bg.setAttribute('uv', new THREE.BufferAttribute(QUAD_UVS, 2))

  bg.computeBoundingBox()
  bg.computeBoundingSphere()
}

// export function updateTilemap(
//   bg: THREE.BufferGeometry,
//   imageWidth: number,
//   imageHeight: number,
//   width: number,
//   height: number,
//   tcodes: TILE_CODES,
//   tcolors: TILE_COLORS,
// ) {
//   //
// }
