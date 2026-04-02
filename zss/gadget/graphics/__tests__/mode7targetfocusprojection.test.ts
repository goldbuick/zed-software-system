jest.mock('zss/config', () => ({
  RUNTIME: {
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
}))

import { Group, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import {
  MODE7_LETTERBOX_SPAN_MARGIN,
  MODE7_NDC_EDGE_SLACK,
  boardndcbounds,
  boardrectcontainssafe,
  isoprojectedtargetfocus,
  mode7projectedtargetfocus,
  safendcrectfrompads,
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
  it('boardndcbounds matches manual min over four projected corners', () => {
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
      }
    }
    expect(full.minx).toBeCloseTo(best, 5)
  })

  it('containment safe rect is ordered for zero pads', () => {
    const safe = safendcrectfrompads(0, 0, 0, 0, 0.05)
    expect(safe.left).toBeLessThan(safe.right)
    expect(safe.bottom).toBeLessThan(safe.top)
    expect(
      boardrectcontainssafe({ minx: 0, maxx: 0, miny: 0, maxy: 0 }, safe),
    ).toBe(true)
  })

  it('restores orthographic frustum after iso projected clamp', () => {
    const camera = new OrthographicCamera(-9, 9, -8, 8, 0.1, 2000)
    camera.position.set(0, 0, 1000)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    const wrong = {
      left: camera.left,
      right: camera.right,
      top: camera.top,
      bottom: camera.bottom,
    }
    const corner = new Group()
    isoprojectedtargetfocus({
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
    expect(camera.left).toBeCloseTo(wrong.left, 10)
    expect(camera.right).toBeCloseTo(wrong.right, 10)
    expect(camera.top).toBeCloseTo(wrong.top, 10)
    expect(camera.bottom).toBeCloseTo(wrong.bottom, 10)
  })

  it('restores camera.aspect after mode7 projected clamp', () => {
    const { camera, corner } = buildmode7scene()
    const wrongaspect = -2.2
    camera.aspect = wrongaspect
    camera.updateProjectionMatrix()
    mode7projectedtargetfocus({
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
    expect(camera.aspect).toBeCloseTo(wrongaspect, 10)
  })

  it('mode7projectedtargetfocus returns finite tfocus', () => {
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
  })

  it('exposes mode7 NDC defaults', () => {
    expect(MODE7_NDC_EDGE_SLACK).toBeGreaterThan(0)
    expect(MODE7_NDC_EDGE_SLACK).toBeLessThan(0.2)
    expect(MODE7_LETTERBOX_SPAN_MARGIN).toBeGreaterThan(0)
    expect(MODE7_LETTERBOX_SPAN_MARGIN).toBeLessThan(0.5)
  })
})
