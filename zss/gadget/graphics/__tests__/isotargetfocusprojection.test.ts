jest.mock('zss/config', () => ({
  RUNTIME: {
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
}))

import { Group, OrthographicCamera } from 'three'
import { flatcameratargetfocus } from 'zss/gadget/graphics/flatcamerabounds'
import {
  ISO_NDC_EDGE_SLACK,
  isoprojectedtargetfocus,
} from 'zss/gadget/graphics/isoprojectedtargetfocus'
import {
  PROJECTED_FOCUS_ORTHO_RELAXED_SLACK,
  boardrectcontainssafe,
  projectboardtondcrect,
  safendcrect,
} from 'zss/gadget/graphics/projectedtargetfocusfromcorners'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

/** Matches [iso.tsx](iso.tsx): portal offset + scene tilt. */
const ISO_SCENE_ROTATION: [number, number, number] = [
  Math.PI * 0.25,
  0,
  Math.PI * -0.25,
]

function verifyjointndccontainment(
  camera: OrthographicCamera,
  corner: Group,
  tfocusx: number,
  tfocusy: number,
  viewwidth: number,
  viewheight: number,
  drawwidth: number,
  drawheight: number,
) {
  const saved = {
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom,
  }
  camera.left = viewwidth * -0.5
  camera.right = viewwidth * 0.5
  camera.top = viewheight * -0.5
  camera.bottom = viewheight * 0.5
  camera.updateProjectionMatrix()
  camera.updateWorldMatrix(true, false)

  const boarddraww = BOARD_WIDTH * drawwidth
  const boarddrawh = BOARD_HEIGHT * drawheight
  const ndc = projectboardtondcrect(
    camera,
    corner,
    tfocusx,
    tfocusy,
    boarddraww,
    boarddrawh,
    drawwidth,
    drawheight,
  )
  const strictsafe = safendcrect(ISO_NDC_EDGE_SLACK)
  const relaxedsafe = safendcrect(PROJECTED_FOCUS_ORTHO_RELAXED_SLACK)
  const fullsafe = safendcrect(0)
  expect(
    boardrectcontainssafe(ndc, strictsafe) ||
      boardrectcontainssafe(ndc, relaxedsafe) ||
      boardrectcontainssafe(ndc, fullsafe),
  ).toBe(true)

  camera.left = saved.left
  camera.right = saved.right
  camera.top = saved.top
  camera.bottom = saved.bottom
  camera.updateProjectionMatrix()
}

type IsoTestSceneOpts = {
  /** When true, portal uses IsoGraphics XY offset (terminal grid alignment). */
  portalxyoffset?: boolean
}

/** Portal + rotation + zoom + corner, as in IsoGraphics (camera is separate, like R3F). */
function setupfullisographicslike(
  cols: number,
  rows: number,
  opts: IsoTestSceneOpts = {},
) {
  const drawwidth = 8
  const drawheight = 16
  const viewwidth = cols * drawwidth
  const viewheight = rows * drawheight
  const fullgridwpx = cols * drawwidth
  const portalxyoffset = opts.portalxyoffset === true
  const centerx = portalxyoffset ? fullgridwpx * -0.5 : 0
  const centery = portalxyoffset ? viewheight * 0.5 : 0

  const camera = new OrthographicCamera(
    viewwidth * -0.5,
    viewwidth * 0.5,
    viewheight * -0.5,
    viewheight * 0.5,
    0.1,
    2000,
  )
  camera.position.set(0, 0, 1000)
  camera.updateProjectionMatrix()
  camera.updateWorldMatrix(true, false)

  const portal = new Group()
  portal.position.set(centerx, centery, portalxyoffset ? -500 : 0)

  const rotation = new Group()
  rotation.rotation.set(
    ISO_SCENE_ROTATION[0],
    ISO_SCENE_ROTATION[1],
    ISO_SCENE_ROTATION[2],
  )

  const zoom = new Group()
  zoom.scale.setScalar(1)
  const corner = new Group()
  zoom.add(corner)
  rotation.add(zoom)
  portal.add(rotation)

  const scene = new Group()
  scene.add(portal)
  scene.updateWorldMatrix(true, false)

  return {
    camera,
    corner,
    viewwidth,
    viewheight,
    drawwidth,
    drawheight,
  }
}

function setupisocameraandcorner() {
  const drawwidth = 8
  const drawheight = 16
  const viewwidth = 40 * drawwidth
  const viewheight = 20 * drawheight

  const camera = new OrthographicCamera(
    viewwidth * -0.5,
    viewwidth * 0.5,
    viewheight * -0.5,
    viewheight * 0.5,
    0.1,
    2000,
  )
  camera.position.set(0, 0, 1000)
  camera.updateProjectionMatrix()
  camera.updateWorldMatrix(true, false)

  const root = new Group()
  const rotation = new Group()
  rotation.rotation.set(Math.PI * 0.25, 0, Math.PI * -0.25)
  const zoom = new Group()
  zoom.scale.setScalar(1)
  const corner = new Group()
  corner.position.set(-120, -80, 0)
  zoom.add(corner)
  rotation.add(zoom)
  root.add(rotation)
  root.updateWorldMatrix(true, false)

  return {
    camera,
    corner,
    viewwidth,
    viewheight,
    drawwidth,
    drawheight,
  }
}

describe('isoprojectedtargetfocus', () => {
  it('returns finite tfocus within board for typical iso ortho setup', () => {
    const { camera, corner, viewwidth, viewheight, drawwidth, drawheight } =
      setupisocameraandcorner()

    const { tfocusx, tfocusy } = isoprojectedtargetfocus({
      camera,
      corner,
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
      boardwidth: BOARD_WIDTH,
      boardheight: BOARD_HEIGHT,
      controlfocusx: 12,
      controlfocusy: 10,
      viewscale: 1,
    })

    expect(Number.isFinite(tfocusx)).toBe(true)
    expect(Number.isFinite(tfocusy)).toBe(true)
    expect(tfocusx).toBeGreaterThanOrEqual(0)
    expect(tfocusx).toBeLessThanOrEqual(BOARD_WIDTH)
    expect(tfocusy).toBeGreaterThanOrEqual(0)
    expect(tfocusy).toBeLessThanOrEqual(BOARD_HEIGHT)
  })

  it('letterboxes to board center like flat when projected board fits in view', () => {
    const drawwidth = 8
    const drawheight = 16
    const viewwidth = BOARD_WIDTH * drawwidth * 3
    const viewheight = BOARD_HEIGHT * drawheight * 3

    const camera = new OrthographicCamera(
      viewwidth * -0.5,
      viewwidth * 0.5,
      viewheight * -0.5,
      viewheight * 0.5,
      0.1,
      2000,
    )
    camera.position.set(0, 0, 1000)
    camera.updateProjectionMatrix()
    camera.updateWorldMatrix(true, false)

    const root = new Group()
    const rotation = new Group()
    rotation.rotation.set(Math.PI * 0.25, 0, Math.PI * -0.25)
    const zoom = new Group()
    const corner = new Group()
    zoom.add(corner)
    rotation.add(zoom)
    root.add(rotation)
    root.updateWorldMatrix(true, false)

    const input = {
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
      viewscale: 1,
      boardwidth: BOARD_WIDTH,
      boardheight: BOARD_HEIGHT,
      controlfocusx: 3,
      controlfocusy: 4,
    }

    const flat = flatcameratargetfocus(input)
    const iso = isoprojectedtargetfocus({
      ...input,
      camera,
      corner,
    })

    expect(flat.tfocusx).toBe(BOARD_WIDTH * 0.5)
    expect(flat.tfocusy).toBe(BOARD_HEIGHT * 0.5)
    expect(iso.tfocusx).toBe(BOARD_WIDTH * 0.5)
    expect(iso.tfocusy).toBe(BOARD_HEIGHT * 0.5)
  })

  it('joint NDC containment for extreme focuses (iso tilt; portal at origin)', () => {
    const drawwidth = 8
    const drawheight = 16
    const viewwidth = BOARD_WIDTH * drawwidth * 3
    const viewheight = BOARD_HEIGHT * drawheight * 3
    const cols = viewwidth / drawwidth
    const rows = viewheight / drawheight
    const {
      camera,
      corner,
      viewwidth: vw,
      viewheight: vh,
      drawwidth: dw,
      drawheight: dh,
    } = setupfullisographicslike(cols, rows)

    const focuses = [
      { x: 0, y: 0 },
      { x: BOARD_WIDTH - 1, y: BOARD_HEIGHT - 1 },
      { x: Math.floor(BOARD_WIDTH * 0.5), y: 0 },
      { x: 0, y: Math.floor(BOARD_HEIGHT * 0.5) },
    ]

    for (const { x, y } of focuses) {
      const { tfocusx, tfocusy } = isoprojectedtargetfocus({
        camera,
        corner,
        viewwidth: vw,
        viewheight: vh,
        drawwidth: dw,
        drawheight: dh,
        boardwidth: BOARD_WIDTH,
        boardheight: BOARD_HEIGHT,
        controlfocusx: x,
        controlfocusy: y,
        viewscale: 1,
      })
      verifyjointndccontainment(
        camera,
        corner,
        tfocusx,
        tfocusy,
        vw,
        vh,
        dw,
        dh,
      )
    }
  })

  it('terminal-aligned portal returns finite tfocus (IsoGraphics XY offset)', () => {
    const cols = 40
    const rows = 20
    const { camera, corner, viewwidth, viewheight, drawwidth, drawheight } =
      setupfullisographicslike(cols, rows, { portalxyoffset: true })

    const { tfocusx, tfocusy } = isoprojectedtargetfocus({
      camera,
      corner,
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
      boardwidth: BOARD_WIDTH,
      boardheight: BOARD_HEIGHT,
      controlfocusx: 0,
      controlfocusy: 0,
      viewscale: 1,
    })

    expect(Number.isFinite(tfocusx)).toBe(true)
    expect(Number.isFinite(tfocusy)).toBe(true)
    expect(tfocusx).toBeGreaterThanOrEqual(0)
    expect(tfocusx).toBeLessThanOrEqual(BOARD_WIDTH)
    expect(tfocusy).toBeGreaterThanOrEqual(0)
    expect(tfocusy).toBeLessThanOrEqual(BOARD_HEIGHT)
  })
})
