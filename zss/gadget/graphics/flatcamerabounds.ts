import { clamp } from 'zss/mapping/number'

/** Inputs for the same target-focus clamp as [flat.tsx](flat.tsx) edge logic. */
export type FlatCameraTargetFocusInput = {
  viewwidth: number
  viewheight: number
  drawwidth: number
  drawheight: number
  viewscale: number
  boardwidth: number
  boardheight: number
  controlfocusx: number
  controlfocusy: number
  /** Draw units of safe margin per edge (adds to half-extent used for clamp; 0 = flat default). */
  padleft?: number
  padright?: number
  padtop?: number
  padbottom?: number
}

/**
 * Target focus (before damp) after edge clamping: ortho view is ±viewwidth/2 × ±viewheight/2,
 * board spans [0, boardwidth×drawwidth] × [0, boardheight×drawheight] under corner pan
 * (focus cell center at origin, then zoom). Optional pads tighten the clamp (iso/mode7).
 */
export function flatcameratargetfocus(input: FlatCameraTargetFocusInput): {
  tfocusx: number
  tfocusy: number
} {
  const {
    viewwidth,
    viewheight,
    drawwidth,
    drawheight,
    viewscale,
    boardwidth,
    boardheight,
    controlfocusx,
    controlfocusy,
    padleft = 0,
    padright = 0,
    padtop = 0,
    padbottom = 0,
  } = input

  const boarddrawwidth = boardwidth * drawwidth
  const boarddrawheight = boardheight * drawheight
  const halfw = viewwidth * 0.5
  const halfh = viewheight * 0.5

  let tfocusx: number
  if (viewwidth - padleft - padright > boarddrawwidth * viewscale) {
    tfocusx = boardwidth * 0.5
  } else {
    const leftedge = (halfw + padleft) / (drawwidth * viewscale)
    const rightedge = boardwidth - (halfw + padright) / (drawwidth * viewscale)
    tfocusx = clamp(controlfocusx, leftedge - 1, rightedge + 0.25)
  }

  let tfocusy: number
  if (viewheight - padtop - padbottom > boarddrawheight * viewscale) {
    tfocusy = boardheight * 0.5
  } else {
    const topedge = (halfh + padtop) / (drawheight * viewscale)
    const bottomedge = boardheight - (halfh + padbottom) / (drawheight * viewscale)
    tfocusy = clamp(controlfocusy, topedge - 1, bottomedge)
  }

  return { tfocusx, tfocusy }
}

export type FlatCameraWorldBoardFromCornerInput = {
  centerx: number
  centery: number
  viewscale: number
  /** `cornerref.position.x` after pan damp (negative of scaled focus center in draw units). */
  cornerx: number
  cornery: number
  drawwidth: number
  drawheight: number
  boardwidth: number
  boardheight: number
}

/**
 * Axis-aligned world extents of the board rectangle under
 * `group(center) → zoom(scale) → corner(translate) → tiles [0,boardw]×[0,boardh]`.
 */
export function flatcameraworldboardextentsfromcorner(
  input: FlatCameraWorldBoardFromCornerInput,
) {
  const boardw = input.boardwidth * input.drawwidth
  const boardh = input.boardheight * input.drawheight
  const { centerx, centery, viewscale, cornerx, cornery } = input
  const minworldx = centerx + viewscale * cornerx
  const maxworldx = centerx + viewscale * (cornerx + boardw)
  const minworldy = centery + viewscale * cornery
  const maxworldy = centery + viewscale * (cornery + boardh)
  return { minworldx, maxworldx, minworldy, maxworldy }
}

const FRUSTUM_EPS = 1e-3

/**
 * Dev-only: log if the ortho view shows void past the board (focus clamp invariant).
 * When panned, only part of the board is visible; we still require no empty margin
 * **past the board** on each axis where the scaled board is at least as large as the view.
 * Skip an axis when the view is wider/taller than the scaled board (letterboxing).
 */
export function flatcameradevassertboardinortho(
  input: FlatCameraWorldBoardFromCornerInput & {
    viewwidth: number
    viewheight: number
    cellepsilon: number
    checkhoriz: boolean
    checkvert: boolean
  },
): boolean {
  const { minworldx, maxworldx, minworldy, maxworldy } =
    flatcameraworldboardextentsfromcorner(input)
  const halfw = input.viewwidth * 0.5
  const halfh = input.viewheight * 0.5
  const eps = FRUSTUM_EPS + input.cellepsilon
  const noleftvoid = minworldx <= -halfw + eps
  const norightvoid = maxworldx >= halfw - eps
  const notopvoid = minworldy <= -halfh + eps
  const nobottomvoid = maxworldy >= halfh - eps
  const okhoriz = !input.checkhoriz || (noleftvoid && norightvoid)
  const okvert = !input.checkvert || (notopvoid && nobottomvoid)
  const ok = okhoriz && okvert
  if (!ok) {
    console.error('[flat camera bounds] void past board edge in ortho view', {
      minworldx,
      maxworldx,
      minworldy,
      maxworldy,
      frustumx: [-halfw, halfw],
      frustumy: [-halfh, halfh],
      eps,
      flags: { noleftvoid, norightvoid, notopvoid, nobottomvoid },
    })
  }
  return ok
}
