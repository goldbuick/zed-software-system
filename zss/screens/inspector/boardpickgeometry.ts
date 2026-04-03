import { BufferAttribute, BufferGeometry } from 'three'
import { RUNTIME } from 'zss/config'

/**
 * Single quad [0, W] × [0, H] with +Y downward — same frame as `Tiles` /
 * `createTilemapBufferGeometryAttributes`, unlike Three.js PlaneGeometry
 * (which uses `vertices.push(x, -y, 0)` and mismatches tile row math).
 */
export function createboardpickgeometry(pickw: number, pickh: number) {
  const cw = RUNTIME.DRAW_CHAR_WIDTH()
  const ch = RUNTIME.DRAW_CHAR_HEIGHT()
  const W = pickw * cw
  const H = pickh * ch
  const geo = new BufferGeometry()
  const pos = new Float32Array([
    0,
    0,
    0,
    W,
    0,
    0,
    W,
    H,
    0,
    0,
    0,
    0,
    W,
    H,
    0,
    0,
    H,
    0,
  ])
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}

/** Same triangle pair as the board pick quad, arbitrary pixel size (aligned to tile mesh, not PlaneGeometry). */
export function createpixelquadgeometry(widthpx: number, heightpx: number) {
  const W = widthpx
  const H = heightpx
  const geo = new BufferGeometry()
  const pos = new Float32Array([
    0,
    0,
    0,
    W,
    0,
    0,
    W,
    H,
    0,
    0,
    0,
    0,
    W,
    H,
    0,
    0,
    H,
    0,
  ])
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}
