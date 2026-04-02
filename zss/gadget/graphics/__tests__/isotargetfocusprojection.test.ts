jest.mock('zss/config', () => ({
  RUNTIME: {
    DRAW_CHAR_WIDTH: () => 8,
    DRAW_CHAR_HEIGHT: () => 16,
  },
}))

import { Group, OrthographicCamera } from 'three'
import { flatcameratargetfocus } from 'zss/gadget/graphics/flatcamerabounds'
import { isoprojectedtargetfocus } from 'zss/gadget/graphics/mode7targetfocusprojection'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

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
    const {
      camera,
      corner,
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
    } = setupisocameraandcorner()

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
      padleft: 0,
      padright: 0,
      padtop: 0,
      padbottom: 0,
    })

    expect(Number.isFinite(tfocusx)).toBe(true)
    expect(Number.isFinite(tfocusy)).toBe(true)
    expect(tfocusx).toBeGreaterThanOrEqual(0)
    expect(tfocusx).toBeLessThanOrEqual(BOARD_WIDTH)
    expect(tfocusy).toBeGreaterThanOrEqual(0)
    expect(tfocusy).toBeLessThanOrEqual(BOARD_HEIGHT)
  })

  it('differs from flatcameratargetfocus when the board hierarchy uses iso tilt', () => {
    const {
      camera,
      corner,
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
    } = setupisocameraandcorner()

    const input = {
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
      viewscale: 1,
      padleft: 0,
      padright: 0,
      padtop: 0,
      padbottom: 0,
      boardwidth: BOARD_WIDTH,
      boardheight: BOARD_HEIGHT,
      controlfocusx: 1,
      controlfocusy: 1,
    }

    const flat = flatcameratargetfocus(input)
    const iso = isoprojectedtargetfocus({
      ...input,
      camera,
      corner,
    })

    const dx = Math.abs(iso.tfocusx - flat.tfocusx)
    const dy = Math.abs(iso.tfocusy - flat.tfocusy)
    expect(dx > 1e-4 || dy > 1e-4).toBe(true)
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
      padleft: 0,
      padright: 0,
      padtop: 0,
      padbottom: 0,
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
})
