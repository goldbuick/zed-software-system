import type { Group, PerspectiveCamera } from 'three'
import { Vector3 } from 'three'
import { flatcameratargetfocus } from 'zss/gadget/graphics/flatcamerabounds'
import { clamp } from 'zss/mapping/number'

const EPS = 1e-5
const BINARY_ITERS = 24
/** Slightly relax edge constraints vs exact ±1 NDC (float + tilt + NEAR zoom); widens valid pan range. */
const NDC_EDGE_SLACK = 0.045
/** Only treat board as “fits vertically” when projected span is clearly under full view (avoids false letterbox). */
const LETTERBOX_SPAN_MARGIN = 0.12

const _local = new Vector3()
const _corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]

function boardndcbounds(
  camera: PerspectiveCamera,
  corner: Group,
  focusx: number,
  focusy: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
): { minx: number; maxx: number; miny: number; maxy: number } {
  const fx = (focusx + 0.5) * draww
  const fy = (focusy + 0.5) * drawh
  corner.position.set(-fx, -fy, 0)
  corner.updateWorldMatrix(true, true)

  _corners[0].set(0, 0, 0)
  _corners[1].set(boarddraww, 0, 0)
  _corners[2].set(0, boarddrawh, 0)
  _corners[3].set(boarddraww, boarddrawh, 0)

  let minx = Infinity
  let maxx = -Infinity
  let miny = Infinity
  let maxy = -Infinity
  const flipx = camera.aspect < 0
  for (let i = 0; i < 4; i++) {
    _local.copy(_corners[i]).applyMatrix4(corner.matrixWorld).project(camera)
    const nx = flipx ? -_local.x : _local.x
    const ny = _local.y
    if (nx < minx) {
      minx = nx
    }
    if (nx > maxx) {
      maxx = nx
    }
    if (ny < miny) {
      miny = ny
    }
    if (ny > maxy) {
      maxy = ny
    }
  }
  return { minx, maxx, miny, maxy }
}

function padstondc(
  viewwidth: number,
  viewheight: number,
  padleft: number,
  padright: number,
  padtop: number,
  padbottom: number,
) {
  const halfw = viewwidth * 0.5
  const halfh = viewheight * 0.5
  return {
    mxl: padleft / halfw,
    mxr: padright / halfw,
    myt: padtop / halfh,
    myb: padbottom / halfh,
  }
}

function leftok(
  camera: PerspectiveCamera,
  corner: Group,
  fx: number,
  fy: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  mxl: number,
) {
  const b = boardndcbounds(
    camera,
    corner,
    fx,
    fy,
    boarddraww,
    boarddrawh,
    draww,
    drawh,
  )
  return b.minx <= -1 + mxl + NDC_EDGE_SLACK + EPS
}

function rightok(
  camera: PerspectiveCamera,
  corner: Group,
  fx: number,
  fy: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  mxr: number,
) {
  const b = boardndcbounds(
    camera,
    corner,
    fx,
    fy,
    boarddraww,
    boarddrawh,
    draww,
    drawh,
  )
  return b.maxx >= 1 - mxr - NDC_EDGE_SLACK - EPS
}

/** NDC y up: no void above board (sky) — top of quad reaches top margin. */
function topok(
  camera: PerspectiveCamera,
  corner: Group,
  fx: number,
  fy: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  myt: number,
) {
  const b = boardndcbounds(
    camera,
    corner,
    fx,
    fy,
    boarddraww,
    boarddrawh,
    draww,
    drawh,
  )
  return b.maxy >= 1 - myt - NDC_EDGE_SLACK - EPS
}

/** NDC y up: no void below board — bottom of quad reaches bottom margin. */
function bottomok(
  camera: PerspectiveCamera,
  corner: Group,
  fx: number,
  fy: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  myb: number,
) {
  const b = boardndcbounds(
    camera,
    corner,
    fx,
    fy,
    boarddraww,
    boarddrawh,
    draww,
    drawh,
  )
  return b.miny <= -1 + myb + NDC_EDGE_SLACK + EPS
}

/** Smallest focusx where left edge constraint holds (minx <= -1+mxl). */
function smallestfxwhereleftok(
  camera: PerspectiveCamera,
  corner: Group,
  fy: number,
  boardw: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  mxl: number,
): number {
  if (
    leftok(camera, corner, 0, fy, boarddraww, boarddrawh, draww, drawh, mxl)
  ) {
    return 0
  }
  if (
    !leftok(
      camera,
      corner,
      boardw,
      fy,
      boarddraww,
      boarddrawh,
      draww,
      drawh,
      mxl,
    )
  ) {
    return NaN
  }
  let lo = 0
  let hi = boardw
  for (let i = 0; i < BINARY_ITERS; i++) {
    const mid = (lo + hi) * 0.5
    if (
      leftok(camera, corner, mid, fy, boarddraww, boarddrawh, draww, drawh, mxl)
    ) {
      hi = mid
    } else {
      lo = mid
    }
  }
  return hi
}

/** Largest focusx where right edge constraint holds (maxx >= 1-mxr). */
function largestfxwhererightok(
  camera: PerspectiveCamera,
  corner: Group,
  fy: number,
  boardw: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  mxr: number,
): number {
  if (
    !rightok(camera, corner, 0, fy, boarddraww, boarddrawh, draww, drawh, mxr)
  ) {
    return NaN
  }
  if (
    rightok(
      camera,
      corner,
      boardw,
      fy,
      boarddraww,
      boarddrawh,
      draww,
      drawh,
      mxr,
    )
  ) {
    return boardw
  }
  let lo = 0
  let hi = boardw
  for (let i = 0; i < BINARY_ITERS; i++) {
    const mid = (lo + hi) * 0.5
    if (
      rightok(
        camera,
        corner,
        mid,
        fy,
        boarddraww,
        boarddrawh,
        draww,
        drawh,
        mxr,
      )
    ) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return lo
}

/** Smallest focusy where top constraint holds (maxy >= 1-myt). */
function smallestfywheretopok(
  camera: PerspectiveCamera,
  corner: Group,
  fx: number,
  boardh: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  myt: number,
): number {
  if (topok(camera, corner, fx, 0, boarddraww, boarddrawh, draww, drawh, myt)) {
    return 0
  }
  if (
    !topok(
      camera,
      corner,
      fx,
      boardh,
      boarddraww,
      boarddrawh,
      draww,
      drawh,
      myt,
    )
  ) {
    return NaN
  }
  let lo = 0
  let hi = boardh
  for (let i = 0; i < BINARY_ITERS; i++) {
    const mid = (lo + hi) * 0.5
    if (
      topok(camera, corner, fx, mid, boarddraww, boarddrawh, draww, drawh, myt)
    ) {
      hi = mid
    } else {
      lo = mid
    }
  }
  return hi
}

/** Largest focusy where bottom constraint holds (miny <= -1+myb). */
function largestfywherebottomok(
  camera: PerspectiveCamera,
  corner: Group,
  fx: number,
  boardh: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  myb: number,
): number {
  if (
    !bottomok(camera, corner, fx, 0, boarddraww, boarddrawh, draww, drawh, myb)
  ) {
    return NaN
  }
  if (
    bottomok(
      camera,
      corner,
      fx,
      boardh,
      boarddraww,
      boarddrawh,
      draww,
      drawh,
      myb,
    )
  ) {
    return boardh
  }
  let lo = 0
  let hi = boardh
  for (let i = 0; i < BINARY_ITERS; i++) {
    const mid = (lo + hi) * 0.5
    if (
      bottomok(
        camera,
        corner,
        fx,
        mid,
        boarddraww,
        boarddrawh,
        draww,
        drawh,
        myb,
      )
    ) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return lo
}

export type Mode7ProjectedTargetFocusInput = {
  camera: PerspectiveCamera
  corner: Group
  viewwidth: number
  viewheight: number
  drawwidth: number
  drawheight: number
  boardwidth: number
  boardheight: number
  controlfocusx: number
  controlfocusy: number
  viewscale: number
  padleft: number
  padright: number
  padtop: number
  padbottom: number
}

/**
 * Target focus from board corners projected through the real perspective camera (mode7).
 * Raw NDC from Vector3.project (camera matrix includes roll and aspect). X flipped when aspect is negative.
 * Gauss–Seidel passes resolve X/Y coupling (each pass uses updated tfocusy when solving X).
 * Falls back to flatcameratargetfocus when projection bounds are degenerate.
 * Restores corner.position to its value at entry.
 */
export function mode7projectedtargetfocus(
  input: Mode7ProjectedTargetFocusInput,
): { tfocusx: number; tfocusy: number } {
  const {
    camera,
    corner,
    viewwidth,
    viewheight,
    drawwidth,
    drawheight,
    boardwidth,
    boardheight,
    controlfocusx,
    controlfocusy,
    viewscale,
    padleft,
    padright,
    padtop,
    padbottom,
  } = input

  const boarddrawwidth = boardwidth * drawwidth
  const boarddrawheight = boardheight * drawheight
  const { mxl, mxr, myt, myb } = padstondc(
    viewwidth,
    viewheight,
    padleft,
    padright,
    padtop,
    padbottom,
  )
  const availx = 2 - mxl - mxr
  const availy = 2 - myt - myb

  const savedx = corner.position.x
  const savedy = corner.position.y
  const savedz = corner.position.z

  const fallback = () => {
    corner.position.set(savedx, savedy, savedz)
    return flatcameratargetfocus({
      viewwidth,
      viewheight,
      drawwidth,
      drawheight,
      viewscale,
      boardwidth,
      boardheight,
      controlfocusx,
      controlfocusy,
      padleft,
      padright,
      padtop,
      padbottom,
    })
  }

  let tfocusx = boardwidth * 0.5
  let tfocusy = boardheight * 0.5
  let fyforx = controlfocusy

  for (let pass = 0; pass < 3; pass++) {
    const bx = boardndcbounds(
      camera,
      corner,
      controlfocusx,
      fyforx,
      boarddrawwidth,
      boarddrawheight,
      drawwidth,
      drawheight,
    )
    const spanx = bx.maxx - bx.minx
    if (spanx <= availx - LETTERBOX_SPAN_MARGIN) {
      tfocusx = boardwidth * 0.5
    } else {
      const flo = smallestfxwhereleftok(
        camera,
        corner,
        fyforx,
        boardwidth,
        boarddrawwidth,
        boarddrawheight,
        drawwidth,
        drawheight,
        mxl,
      )
      const fhi = largestfxwhererightok(
        camera,
        corner,
        fyforx,
        boardwidth,
        boarddrawwidth,
        boarddrawheight,
        drawwidth,
        drawheight,
        mxr,
      )
      if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo > fhi + 1e-4) {
        return fallback()
      }
      tfocusx = clamp(controlfocusx, flo, fhi)
    }

    const fx = tfocusx
    const by = boardndcbounds(
      camera,
      corner,
      fx,
      controlfocusy,
      boarddrawwidth,
      boarddrawheight,
      drawwidth,
      drawheight,
    )
    const spany = by.maxy - by.miny
    if (spany <= availy - LETTERBOX_SPAN_MARGIN) {
      tfocusy = boardheight * 0.5
    } else {
      const glo = smallestfywheretopok(
        camera,
        corner,
        fx,
        boardheight,
        boarddrawwidth,
        boarddrawheight,
        drawwidth,
        drawheight,
        myt,
      )
      const ghi = largestfywherebottomok(
        camera,
        corner,
        fx,
        boardheight,
        boarddrawwidth,
        boarddrawheight,
        drawwidth,
        drawheight,
        myb,
      )
      if (!Number.isFinite(glo) || !Number.isFinite(ghi) || glo > ghi + 1e-4) {
        return fallback()
      }
      tfocusy = clamp(controlfocusy, glo, ghi)
    }

    fyforx = tfocusy
  }

  corner.position.set(savedx, savedy, savedz)
  return { tfocusx, tfocusy }
}
