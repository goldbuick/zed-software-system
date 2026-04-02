jest.mock('zss/config', () => ({
  RUNTIME: {
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
}))

import { Group, PerspectiveCamera, Vector3 } from 'three'
import {
  MODE7_LETTERBOX_SPAN_MARGIN,
  MODE7_NDC_EDGE_SLACK,
  boardndcbounds,
  boardndchorizontalnearfloor,
  mode7projectedtargetfocus,
} from 'zss/gadget/graphics/mode7targetfocusprojection'
import { MODE7_Z_MID } from 'zss/gadget/graphics/mode7viewscale'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

const DRAW_W = 8
const DRAW_H = 16
const VIEW_W = 80 * DRAW_W
const VIEW_H = BOARD_HEIGHT * DRAW_H

function buildmode7scene() {
  const camera = new PerspectiveCamera(50, -VIEW_W / VIEW_H, 0.1, 2000)
  camera.position.set(0, 0, MODE7_Z_MID)
  camera.rotation.z = Math.PI
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)

  const tilt = new Group()
  tilt.rotation.x = 0.777
  const corner = new Group()
  tilt.add(corner)
  tilt.updateMatrixWorld(true)

  return { camera, tilt, corner }
}

describe('mode7targetfocusprojection', () => {
  it('full-quad horizontal minx can differ from near-floor minx (corner dominance)', () => {
    const { camera, corner } = buildmode7scene()
    const boarddraww = BOARD_WIDTH * DRAW_W
    const boarddrawh = BOARD_HEIGHT * DRAW_H
    const focusx = BOARD_WIDTH * 0.5
    const focusy = BOARD_HEIGHT * 0.5

    const full = boardndcbounds(
      camera,
      corner,
      focusx,
      focusy,
      boarddraww,
      boarddrawh,
      DRAW_W,
      DRAW_H,
    )
    const near = boardndchorizontalnearfloor(
      camera,
      corner,
      focusx,
      focusy,
      boarddraww,
      boarddrawh,
      DRAW_W,
      DRAW_H,
    )

    const flipx =
      'aspect' in camera &&
      typeof camera.aspect === 'number' &&
      camera.aspect < 0
    const cornerslocal = [
      new Vector3(0, 0, 0),
      new Vector3(boarddraww, 0, 0),
      new Vector3(0, boarddrawh, 0),
      new Vector3(boarddraww, boarddrawh, 0),
    ]
    let whichmin = -1
    let best = Infinity
    const v = new Vector3()
    for (let i = 0; i < 4; i++) {
      corner.position.set(
        -((focusx + 0.5) * DRAW_W),
        -((focusy + 0.5) * DRAW_H),
        0,
      )
      corner.updateWorldMatrix(true, true)
      v.copy(cornerslocal[i]).applyMatrix4(corner.matrixWorld).project(camera)
      const nx = flipx ? -v.x : v.x
      if (nx < best) {
        best = nx
        whichmin = i
      }
    }
    expect(full.minx).toBeCloseTo(best, 5)
    expect(whichmin).toBeGreaterThanOrEqual(0)

    expect(full.minx).toBeLessThanOrEqual(near.minx + 1e-5)
    expect(near.maxx).toBeGreaterThanOrEqual(near.minx)
    if (whichmin === 0 || whichmin === 1) {
      expect(near.minx).toBeGreaterThan(full.minx + 1e-4)
    }
  })

  it('mode7projectedtargetfocus returns finite tfocus with default slack (not edgeslack 0.9)', () => {
    const { camera, corner } = buildmode7scene()
    const { tfocusx, tfocusy } = mode7projectedtargetfocus({
      camera,
      corner,
      viewwidth: VIEW_W,
      viewheight: VIEW_H,
      drawwidth: DRAW_W,
      drawheight: DRAW_H,
      boardwidth: BOARD_WIDTH,
      boardheight: BOARD_HEIGHT,
      controlfocusx: 12,
      controlfocusy: 8,
      viewscale: 1,
      padleft: 0,
      padright: 0,
      padtop: 0,
      padbottom: 0,
    })
    expect(Number.isFinite(tfocusx)).toBe(true)
    expect(Number.isFinite(tfocusy)).toBe(true)
    expect(tfocusx).toBeGreaterThanOrEqual(-0.5)
    expect(tfocusx).toBeLessThanOrEqual(BOARD_WIDTH + 0.5)
    expect(tfocusy).toBeGreaterThanOrEqual(-0.5)
    expect(tfocusy).toBeLessThanOrEqual(BOARD_HEIGHT + 0.5)
  })

  it('exposes mode7 NDC defaults used when edgeslack is not overridden', () => {
    expect(MODE7_NDC_EDGE_SLACK).toBeGreaterThan(0)
    expect(MODE7_NDC_EDGE_SLACK).toBeLessThan(0.2)
    expect(MODE7_LETTERBOX_SPAN_MARGIN).toBeGreaterThan(0)
    expect(MODE7_LETTERBOX_SPAN_MARGIN).toBeLessThan(0.5)
  })
})
