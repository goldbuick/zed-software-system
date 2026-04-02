import type { Camera, Group } from 'three'
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { flatcameratargetfocus } from 'zss/gadget/graphics/flatcamerabounds'
import { clamp } from 'zss/mapping/number'

const EPS = 1e-5
const BINARY_ITERS = 24
const NDC_EDGE_SLACK = 0.045
const LETTERBOX_SPAN_MARGIN = 0.12

export const MODE7_NDC_EDGE_SLACK = 0.055
export const MODE7_LETTERBOX_SPAN_MARGIN = 0.14

/** Axis-aligned bounds in NDC (Vector3.project). */
export type NdcAxisAlignedRect = {
  minx: number
  maxx: number
  miny: number
  maxy: number
}

/** Inner safe rectangle in NDC from padstondc + edgeslack (containment target). */
export type SafeNdcRect = {
  left: number
  right: number
  bottom: number
  top: number
}

const _local = new Vector3()
const _corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]

function cameranegativeaspect(camera: Camera) {
  return (
    'aspect' in camera &&
    typeof (camera as { aspect?: number }).aspect === 'number' &&
    (camera as { aspect: number }).aspect < 0
  )
}

function snapprojectionaspectfromview(
  camera: Camera,
  viewwidth: number,
  viewheight: number,
): number | undefined {
  if (!(camera instanceof PerspectiveCamera) || viewheight <= 0) {
    return undefined
  }
  const saved = camera.aspect
  const ratio = viewwidth / viewheight
  camera.aspect = saved < 0 ? -ratio : ratio
  camera.updateProjectionMatrix()
  return saved
}

function restoreprojectionaspect(camera: Camera, saved: number | undefined) {
  if (saved === undefined) {
    return
  }
  const c = camera as PerspectiveCamera
  c.aspect = saved
  c.updateProjectionMatrix()
}

type Savedorthographicfrustum = {
  left: number
  right: number
  top: number
  bottom: number
}

function snaporthographicprojectionfromview(
  camera: Camera,
  viewwidth: number,
  viewheight: number,
): Savedorthographicfrustum | undefined {
  if (!(camera instanceof OrthographicCamera)) {
    return undefined
  }
  const saved: Savedorthographicfrustum = {
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
  return saved
}

function restoreorthographicprojection(
  camera: Camera,
  saved: Savedorthographicfrustum | undefined,
) {
  if (saved === undefined) {
    return
  }
  const c = camera as OrthographicCamera
  c.left = saved.left
  c.right = saved.right
  c.top = saved.top
  c.bottom = saved.bottom
  c.updateProjectionMatrix()
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

/**
 * Padded inner NDC rectangle: board AABB must lie fully inside this (containment clamp).
 */
export function safendcrectfrompads(
  mxl: number,
  mxr: number,
  myt: number,
  myb: number,
  edgeslack: number,
): SafeNdcRect {
  return {
    left: -1 + mxl + edgeslack,
    right: 1 - mxr - edgeslack,
    bottom: -1 + myb + edgeslack,
    top: 1 - myt - edgeslack,
  }
}

/** True if `board` is fully inside `safe` (axis-aligned NDC). */
export function boardrectcontainssafe(
  board: NdcAxisAlignedRect,
  safe: SafeNdcRect,
): boolean {
  return (
    board.minx >= safe.left - EPS &&
    board.maxx <= safe.right + EPS &&
    board.miny >= safe.bottom - EPS &&
    board.maxy <= safe.top + EPS
  )
}

/**
 * Project four board corners (full quad) to NDC and return axis-aligned bounds.
 * Sets corner pan from focus cell center, then restores are caller’s responsibility.
 */
export function projectboardtondcrect(
  camera: Camera,
  corner: Group,
  focusx: number,
  focusy: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
): NdcAxisAlignedRect {
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
  const flipx = cameranegativeaspect(camera)
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

export const boardndcbounds = projectboardtondcrect

/** Smallest v in [lo, hi] where pred(v), assuming pred(lo) false and pred(hi) true. */
function binarysearchlowermosttrue(
  lo: number,
  hi: number,
  pred: (v: number) => boolean,
): number | null {
  if (pred(lo)) {
    return lo
  }
  if (!pred(hi)) {
    return null
  }
  let a = lo
  let b = hi
  for (let i = 0; i < BINARY_ITERS; i++) {
    const mid = (a + b) * 0.5
    if (pred(mid)) {
      b = mid
    } else {
      a = mid
    }
  }
  return b
}

/** Largest v in [lo, hi] where pred(v), assuming pred(lo) true and pred(hi) false. */
function binarysearchuppermosttrue(
  lo: number,
  hi: number,
  pred: (v: number) => boolean,
): number | null {
  if (pred(hi)) {
    return hi
  }
  if (!pred(lo)) {
    return null
  }
  let a = lo
  let b = hi
  for (let i = 0; i < BINARY_ITERS; i++) {
    const mid = (a + b) * 0.5
    if (pred(mid)) {
      a = mid
    } else {
      b = mid
    }
  }
  return a
}

/**
 * Connected interval of focus values in [minfocus, maxfocus] where pred holds
 * (assumes pred is true on a contiguous subinterval when feasible).
 */
function findfeasiblefocusinterval(
  minfocus: number,
  maxfocus: number,
  pred: (focus: number) => boolean,
): { lo: number; hi: number } | null {
  if (pred(minfocus) && pred(maxfocus)) {
    return { lo: minfocus, hi: maxfocus }
  }
  const lo = binarysearchlowermosttrue(minfocus, maxfocus, pred)
  if (lo === null) {
    return null
  }
  const hi = binarysearchuppermosttrue(lo, maxfocus, pred)
  if (hi === null || lo > hi + 1e-4) {
    return null
  }
  return { lo, hi }
}

function findfeasiblefxinterval(
  camera: Camera,
  corner: Group,
  fy: number,
  boardw: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  safe: SafeNdcRect,
): { lo: number; hi: number } | null {
  return findfeasiblefocusinterval(0, boardw, (fx) =>
    boardrectcontainssafe(
      projectboardtondcrect(
        camera,
        corner,
        fx,
        fy,
        boarddraww,
        boarddrawh,
        draww,
        drawh,
      ),
      safe,
    ),
  )
}

function findfeasiblefyinterval(
  camera: Camera,
  corner: Group,
  fx: number,
  boardh: number,
  boarddraww: number,
  boarddrawh: number,
  draww: number,
  drawh: number,
  safe: SafeNdcRect,
): { lo: number; hi: number } | null {
  return findfeasiblefocusinterval(0, boardh, (fy) =>
    boardrectcontainssafe(
      projectboardtondcrect(
        camera,
        corner,
        fx,
        fy,
        boarddraww,
        boarddrawh,
        draww,
        drawh,
      ),
      safe,
    ),
  )
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
  edgeslack?: number
  letterboxmargin?: number
}

export type IsoProjectedTargetFocusInput = {
  camera: OrthographicCamera
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

type ProjectedTargetFocusFromCornersInput = {
  camera: Camera
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
  edgeslack?: number
  letterboxmargin?: number
}

/**
 * Target focus: board quad in NDC must lie inside the padded safe rectangle (containment).
 * Gauss–Seidel passes handle x/y coupling. Falls back to flatcameratargetfocus when infeasible.
 */
function projectedtargetfocusfromcorners(
  input: ProjectedTargetFocusFromCornersInput,
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
    edgeslack = NDC_EDGE_SLACK,
    letterboxmargin = LETTERBOX_SPAN_MARGIN,
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

  const savedaspect = snapprojectionaspectfromview(
    camera,
    viewwidth,
    viewheight,
  )
  const savedortho = snaporthographicprojectionfromview(
    camera,
    viewwidth,
    viewheight,
  )

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

  const safe = safendcrectfrompads(mxl, mxr, myt, myb, edgeslack)
  if (safe.left >= safe.right - EPS || safe.bottom >= safe.top - EPS) {
    corner.position.set(savedx, savedy, savedz)
    restoreorthographicprojection(camera, savedortho)
    restoreprojectionaspect(camera, savedaspect)
    return fallback()
  }

  try {
    let tfocusx = boardwidth * 0.5
    let tfocusy = boardheight * 0.5
    let fyforx = controlfocusy

    for (let pass = 0; pass < 3; pass++) {
      const bx = projectboardtondcrect(
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
      if (spanx <= availx - letterboxmargin) {
        tfocusx = boardwidth * 0.5
      } else {
        const ix = findfeasiblefxinterval(
          camera,
          corner,
          fyforx,
          boardwidth,
          boarddrawwidth,
          boarddrawheight,
          drawwidth,
          drawheight,
          safe,
        )
        if (ix === null) {
          return fallback()
        }
        tfocusx = clamp(controlfocusx, ix.lo, ix.hi)
      }

      const fx = tfocusx
      const by = projectboardtondcrect(
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
      if (spany <= availy - letterboxmargin) {
        tfocusy = boardheight * 0.5
      } else {
        const iy = findfeasiblefyinterval(
          camera,
          corner,
          fx,
          boardheight,
          boarddrawwidth,
          boarddrawheight,
          drawwidth,
          drawheight,
          safe,
        )
        if (iy === null) {
          return fallback()
        }
        tfocusy = clamp(controlfocusy, iy.lo, iy.hi)
      }

      fyforx = tfocusy
    }

    return { tfocusx, tfocusy }
  } finally {
    restoreorthographicprojection(camera, savedortho)
    restoreprojectionaspect(camera, savedaspect)
    corner.position.set(savedx, savedy, savedz)
  }
}

export function mode7projectedtargetfocus(
  input: Mode7ProjectedTargetFocusInput,
): { tfocusx: number; tfocusy: number } {
  return projectedtargetfocusfromcorners({
    ...input,
    edgeslack: input.edgeslack ?? MODE7_NDC_EDGE_SLACK,
    letterboxmargin: input.letterboxmargin ?? MODE7_LETTERBOX_SPAN_MARGIN,
  })
}

export function isoprojectedtargetfocus(input: IsoProjectedTargetFocusInput): {
  tfocusx: number
  tfocusy: number
} {
  return projectedtargetfocusfromcorners(input)
}
