import type { Camera, Group } from 'three'
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { flatcameratargetfocus } from 'zss/gadget/graphics/flatcamerabounds'
import { clamp } from 'zss/mapping/number'

const EPS = 1e-5
const BINARY_ITERS = 24
const NDC_EDGE_SLACK = 0.045
const LETTERBOX_SPAN_MARGIN = 0.12
/** Gauss–Seidel passes until NDC containment holds (iso/mode7 coupling); capped for safety. */
const PROJECTED_FOCUS_MAX_PASSES = 12
/** Near-full NDC inset: second ortho phase when strict safe is infeasible under portal + tilt. */
export const PROJECTED_FOCUS_ORTHO_RELAXED_SLACK = 1e-5

/** Axis-aligned bounds in NDC (Vector3.project). */
export type NdcAxisAlignedRect = {
  minx: number
  maxx: number
  miny: number
  maxy: number
}

/** Inner safe rectangle in NDC from edgeslack inset (containment target). */
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

/**
 * Inner NDC rectangle with symmetric edge inset: board AABB must lie fully inside (containment clamp).
 */
export function safendcrect(edgeslack: number): SafeNdcRect {
  return {
    left: -1 + edgeslack,
    right: 1 - edgeslack,
    bottom: -1 + edgeslack,
    top: 1 - edgeslack,
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

export type ProjectedTargetFocusFromCornersInput = {
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
  edgeslack?: number
  letterboxmargin?: number
}

/**
 * Target focus: board quad in NDC must lie inside the safe rectangle (containment).
 * Per axis: if that axis’s projected NDC span is small (letterbox), target uses board center on that
 * axis clamped to the feasible interval; else target follows control focus clamped to feasibility.
 * Gauss–Seidel passes handle x/y coupling until the final (tfocusx, tfocusy) jointly satisfies
 * NDC containment (last fy update can invalidate the prior fx). Falls back to
 * flatcameratargetfocus when still infeasible.
 */
export function projectedtargetfocusfromcorners(
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
    edgeslack = NDC_EDGE_SLACK,
    letterboxmargin = LETTERBOX_SPAN_MARGIN,
  } = input

  const boarddrawwidth = boardwidth * drawwidth
  const boarddrawheight = boardheight * drawheight
  const availx = 2
  const availy = 2

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
    })
  }

  const safe = safendcrect(edgeslack)
  if (safe.left >= safe.right - EPS || safe.bottom >= safe.top - EPS) {
    corner.position.set(savedx, savedy, savedz)
    restoreorthographicprojection(camera, savedortho)
    restoreprojectionaspect(camera, savedaspect)
    return fallback()
  }

  try {
    const letterboxthresholdx = availx - letterboxmargin
    const letterboxthresholdy = availy - letterboxmargin

    const runphasewithsafe = (
      saferect: SafeNdcRect,
    ): { tfocusx: number; tfocusy: number } | null => {
      if (
        saferect.left >= saferect.right - EPS ||
        saferect.bottom >= saferect.top - EPS
      ) {
        return null
      }
      let tfocusx = boardwidth * 0.5
      let tfocusy = boardheight * 0.5
      let fyforx = controlfocusy
      for (let pass = 0; pass < PROJECTED_FOCUS_MAX_PASSES; pass++) {
        const bxy = projectboardtondcrect(
          camera,
          corner,
          controlfocusx,
          fyforx,
          boarddrawwidth,
          boarddrawheight,
          drawwidth,
          drawheight,
        )
        const spanx = bxy.maxx - bxy.minx
        const spany = bxy.maxy - bxy.miny

        const ix = findfeasiblefxinterval(
          camera,
          corner,
          fyforx,
          boardwidth,
          boarddrawwidth,
          boarddrawheight,
          drawwidth,
          drawheight,
          saferect,
        )
        if (ix === null) {
          return null
        }
        tfocusx =
          spanx <= letterboxthresholdx
            ? clamp(boardwidth * 0.5, ix.lo, ix.hi)
            : clamp(controlfocusx, ix.lo, ix.hi)

        const iy = findfeasiblefyinterval(
          camera,
          corner,
          tfocusx,
          boardheight,
          boarddrawwidth,
          boarddrawheight,
          drawwidth,
          drawheight,
          saferect,
        )
        if (iy === null) {
          return null
        }
        tfocusy =
          spany <= letterboxthresholdy
            ? clamp(boardheight * 0.5, iy.lo, iy.hi)
            : clamp(controlfocusy, iy.lo, iy.hi)

        fyforx = tfocusy

        const joint = boardrectcontainssafe(
          projectboardtondcrect(
            camera,
            corner,
            tfocusx,
            tfocusy,
            boarddrawwidth,
            boarddrawheight,
            drawwidth,
            drawheight,
          ),
          saferect,
        )
        if (joint) {
          return { tfocusx, tfocusy }
        }
      }
      return null
    }

    const strictresult = runphasewithsafe(safe)
    if (strictresult) {
      return strictresult
    }
    if (camera instanceof OrthographicCamera) {
      const relaxed = runphasewithsafe(
        safendcrect(PROJECTED_FOCUS_ORTHO_RELAXED_SLACK),
      )
      if (relaxed) {
        return relaxed
      }
      const fullndc = runphasewithsafe(safendcrect(0))
      if (fullndc) {
        return fullndc
      }
    }

    return fallback()
  } finally {
    restoreorthographicprojection(camera, savedortho)
    restoreprojectionaspect(camera, savedaspect)
    corner.position.set(savedx, savedy, savedz)
  }
}
