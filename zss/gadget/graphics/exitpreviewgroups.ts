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
}

function fogdirforkey(key: string): EXIT_DIRECTION {
  switch (key) {
    case 'e':
    case 'e2':
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

function pushgroup(
  out: ExitPreviewGroup[],
  key: string,
  boardid: string,
  layercachemap: Map<string, LAYER[]>,
  hasunderboard: boolean,
  x: number,
  y: number,
) {
  out.push({
    key,
    preview: resolveexitpreview(
      boardid,
      layercachemap,
      fogdirforkey(key),
      hasunderboard,
    ),
    position: [x, y, 0],
  })
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

/**
 * Adjacent-board exit previews at path-relative world slots (flat / mode7 / iso).
 * Live board occupies (boardgridx, boardgridy); neighbors are placed around it.
 * Depth-2 is added only while panphase + travel bias is set.
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
  const out: ExitPreviewGroup[] = []

  const place = (key: string, boardid: string, dx: number, dy: number) => {
    const p = slotpos(gx, gy, dx, dy, w, h)
    pushgroup(out, key, boardid, layercachemap, hasunderboard, p.x, p.y)
  }

  place('e', gadget.exiteast, 1, 0)
  place('w', gadget.exitwest, -1, 0)
  place('n', gadget.exitnorth, 0, -1)
  place('s', gadget.exitsouth, 0, 1)
  place('ne', gadget.exitne, 1, -1)
  place('nw', gadget.exitnw, -1, -1)
  place('se', gadget.exitse, 1, 1)
  place('sw', gadget.exitsw, -1, 1)

  if (panphase && bias.dx === 1) {
    place('e2', gadget.exiteast2 || gadget.exiteast, 2, 0)
  } else if (panphase && bias.dx === -1) {
    place('w2', gadget.exitwest2 || gadget.exitwest, -2, 0)
  }
  if (panphase && bias.dy === -1) {
    place('n2', gadget.exitnorth2 || gadget.exitnorth, 0, -2)
  } else if (panphase && bias.dy === 1) {
    place('s2', gadget.exitsouth2 || gadget.exitsouth, 0, 2)
  }

  return out
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
