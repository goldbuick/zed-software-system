import type { GADGET_STATE, LAYER } from 'zss/gadget/data/types'
import type {
  FocusExitSnap,
  GridBias,
} from 'zss/gadget/graphics/camerafocus'
import {
  type ExitPreviewResolve,
  resolveexitpreview,
} from 'zss/gadget/graphics/exitpreviewresolve'
import type { EXIT_DIRECTION } from 'zss/gadget/graphics/undiscoveredexitlayers'
import { BOARD_HEIGHT, BOARD_WIDTH } from 'zss/memory/types'

export type ExitPreviewGroup = {
  key: string
  preview: ExitPreviewResolve
  position: [number, number, number]
}

type ExitBoardGadget = Pick<
  GADGET_STATE,
  | 'exiteast'
  | 'exitwest'
  | 'exitnorth'
  | 'exitsouth'
  | 'exiteast2'
  | 'exitwest2'
  | 'exitnorth2'
  | 'exitsouth2'
  | 'exitne'
  | 'exitnw'
  | 'exitse'
  | 'exitsw'
  | 'under'
>

export type ExitPreviewBuildOpts = {
  /** Path-relative grid of the live board. */
  boardgridx?: number
  boardgridy?: number
  bias?: GridBias
  /** When true, also place depth-2 in the travel direction. */
  panphase?: boolean
  /**
   * Departure-board exit snapshot (stashed while steady). During panphase,
   * union the departure 3x3 with the live 3x3 so trail boards stay until settle.
   */
  exitsnap?: FocusExitSnap
}

function fogdirforkey(key: string): EXIT_DIRECTION {
  switch (key) {
    case 'e':
    case 'e2':
    case 'c':
      return 'e'
    case 'w':
    case 'w2':
      return 'w'
    case 'n':
    case 'n2':
      return 'n'
    case 's':
    case 's2':
      return 's'
    case 'ne':
      return 'ne'
    case 'nw':
      return 'nw'
    case 'se':
      return 'se'
    case 'sw':
      return 'sw'
    default:
      return 'e'
  }
}

function slotpos(
  gx: number,
  gy: number,
  dx: number,
  dy: number,
  w: number,
  h: number,
): { x: number; y: number } {
  return {
    x: (gx + dx) * w,
    y: (gy + dy) * h,
  }
}

function slotkey(x: number, y: number): string {
  return `${x},${y}`
}

/**
 * Adjacent-board exit previews at path-relative world slots (flat / mode7 / iso / fpv).
 * Live board occupies (boardgridx, boardgridy); neighbors are placed around it.
 * During panphase: union departure 3x3 (from exitsnap) + live 3x3 + depth-2;
 * trail boards are removed only when panphase clears.
 */
export function buildexitpreviewgroups(
  gadget: ExitBoardGadget,
  layercachemap: Map<string, LAYER[]>,
  drawwidth: number,
  drawheight: number,
  opts: ExitPreviewBuildOpts = {},
): ExitPreviewGroup[] {
  const hasunderboard = (gadget.under?.length ?? 0) > 0
  const bias = opts.bias ?? { dx: 0, dy: 0 }
  const panphase = opts.panphase === true
  const gx = opts.boardgridx ?? 0
  const gy = opts.boardgridy ?? 0
  const w = BOARD_WIDTH * drawwidth
  const h = BOARD_HEIGHT * drawheight
  const livex = gx * w
  const livey = gy * h
  const slots = new Map<string, ExitPreviewGroup>()

  const placeslot = (
    key: string,
    boardid: string,
    absx: number,
    absy: number,
  ) => {
    // Live mesh occupies this slot; never draw a preview on top.
    if (absx === livex && absy === livey) {
      return
    }
    slots.set(slotkey(absx, absy), {
      key,
      preview: resolveexitpreview(
        boardid,
        layercachemap,
        fogdirforkey(key),
        hasunderboard,
      ),
      position: [absx, absy, 0],
    })
  }

  const placeat = (
    originx: number,
    originy: number,
    key: string,
    boardid: string,
    dx: number,
    dy: number,
  ) => {
    const p = slotpos(originx, originy, dx, dy, w, h)
    placeslot(key, boardid, p.x, p.y)
  }

  const placeneighbors = (
    originx: number,
    originy: number,
    exits: {
      exiteast: string
      exitwest: string
      exitnorth: string
      exitsouth: string
      exitne: string
      exitnw: string
      exitse: string
      exitsw: string
    },
    keyprefix = '',
  ) => {
    placeat(originx, originy, `${keyprefix}e`, exits.exiteast, 1, 0)
    placeat(originx, originy, `${keyprefix}w`, exits.exitwest, -1, 0)
    placeat(originx, originy, `${keyprefix}n`, exits.exitnorth, 0, -1)
    placeat(originx, originy, `${keyprefix}s`, exits.exitsouth, 0, 1)
    placeat(originx, originy, `${keyprefix}ne`, exits.exitne, 1, -1)
    placeat(originx, originy, `${keyprefix}nw`, exits.exitnw, -1, -1)
    placeat(originx, originy, `${keyprefix}se`, exits.exitse, 1, 1)
    placeat(originx, originy, `${keyprefix}sw`, exits.exitsw, -1, 1)
  }

  const snap = opts.exitsnap
  const hasbias = bias.dx !== 0 || bias.dy !== 0
  if (panphase && snap && hasbias) {
    const departx = gx - bias.dx
    const departy = gy - bias.dy
    // Departure 3x3 first (trail retained until settle).
    placeat(departx, departy, 'c', snap.board, 0, 0)
    placeneighbors(departx, departy, snap, 'd')
  }

  // Live 3x3 overwrites overlapping slots (prefer current gadget ids).
  placeneighbors(gx, gy, gadget)

  if (panphase && bias.dx === 1) {
    placeat(gx, gy, 'e2', gadget.exiteast2 || gadget.exiteast, 2, 0)
  } else if (panphase && bias.dx === -1) {
    placeat(gx, gy, 'w2', gadget.exitwest2 || gadget.exitwest, -2, 0)
  }
  if (panphase && bias.dy === -1) {
    placeat(gx, gy, 'n2', gadget.exitnorth2 || gadget.exitnorth, 0, -2)
  } else if (panphase && bias.dy === 1) {
    placeat(gx, gy, 's2', gadget.exitsouth2 || gadget.exitsouth, 0, 2)
  }

  return [...slots.values()]
}

export function gadgettoexitsnap(
  gadget: Pick<
    GADGET_STATE,
    | 'board'
    | 'exiteast'
    | 'exitwest'
    | 'exitnorth'
    | 'exitsouth'
    | 'exiteast2'
    | 'exitwest2'
    | 'exitnorth2'
    | 'exitsouth2'
    | 'exitne'
    | 'exitnw'
    | 'exitse'
    | 'exitsw'
  >,
): FocusExitSnap {
  return {
    board: gadget.board ?? '',
    exiteast: gadget.exiteast ?? '',
    exitwest: gadget.exitwest ?? '',
    exitnorth: gadget.exitnorth ?? '',
    exitsouth: gadget.exitsouth ?? '',
    exiteast2: gadget.exiteast2 ?? '',
    exitwest2: gadget.exitwest2 ?? '',
    exitnorth2: gadget.exitnorth2 ?? '',
    exitsouth2: gadget.exitsouth2 ?? '',
    exitne: gadget.exitne ?? '',
    exitnw: gadget.exitnw ?? '',
    exitse: gadget.exitse ?? '',
    exitsw: gadget.exitsw ?? '',
  }
}
