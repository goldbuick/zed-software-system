import type { GADGET_STATE, LAYER } from 'zss/gadget/data/types'
import type { FocusExitSnap, GridBias } from 'zss/gadget/graphics/camerafocus'
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
  bias?: GridBias
  panphase?: boolean
  /** Departure-board exit snapshot (from last steady frame). */
  exitsnap?: FocusExitSnap
  /**
   * When panphase, live destination board is drawn at bias offset; skip
   * placing a preview on that slot.
   */
  skipliveboardpreview?: boolean
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

/** Adjacent-board exit previews at fixed offsets (flat / mode7 / iso). */
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
  const w = BOARD_WIDTH * drawwidth
  const h = BOARD_HEIGHT * drawheight
  const out: ExitPreviewGroup[] = []

  if (panphase && opts.exitsnap) {
    const snap = opts.exitsnap
    // Departure-centered window: C at origin, neighbors from snap, depth-2 ahead
    // from current gadget (destination board's far exit).
    pushgroup(out, 'c', snap.board, layercachemap, hasunderboard, 0, 0)
    pushgroup(out, 'e', snap.exiteast, layercachemap, hasunderboard, w, 0)
    pushgroup(out, 'w', snap.exitwest, layercachemap, hasunderboard, -w, 0)
    pushgroup(out, 'n', snap.exitnorth, layercachemap, hasunderboard, 0, -h)
    pushgroup(out, 's', snap.exitsouth, layercachemap, hasunderboard, 0, h)
    pushgroup(out, 'ne', snap.exitne, layercachemap, hasunderboard, w, -h)
    pushgroup(out, 'nw', snap.exitnw, layercachemap, hasunderboard, -w, -h)
    pushgroup(out, 'se', snap.exitse, layercachemap, hasunderboard, w, h)
    pushgroup(out, 'sw', snap.exitsw, layercachemap, hasunderboard, -w, h)

    if (opts.skipliveboardpreview) {
      const livekey =
        bias.dx === 1
          ? 'e'
          : bias.dx === -1
            ? 'w'
            : bias.dy === -1
              ? 'n'
              : bias.dy === 1
                ? 's'
                : ''
      if (livekey) {
        const i = out.findIndex((g) => g.key === livekey)
        if (i >= 0) {
          out.splice(i, 1)
        }
      }
    }

    if (bias.dx === 1) {
      pushgroup(
        out,
        'e2',
        gadget.exiteast,
        layercachemap,
        hasunderboard,
        2 * w,
        0,
      )
    } else if (bias.dx === -1) {
      pushgroup(
        out,
        'w2',
        gadget.exitwest,
        layercachemap,
        hasunderboard,
        -2 * w,
        0,
      )
    }
    if (bias.dy === -1) {
      pushgroup(
        out,
        'n2',
        gadget.exitnorth,
        layercachemap,
        hasunderboard,
        0,
        -2 * h,
      )
    } else if (bias.dy === 1) {
      pushgroup(
        out,
        's2',
        gadget.exitsouth,
        layercachemap,
        hasunderboard,
        0,
        2 * h,
      )
    }
    return out
  }

  pushgroup(out, 'e', gadget.exiteast, layercachemap, hasunderboard, w, 0)
  pushgroup(out, 'w', gadget.exitwest, layercachemap, hasunderboard, -w, 0)
  pushgroup(out, 'n', gadget.exitnorth, layercachemap, hasunderboard, 0, -h)
  pushgroup(out, 's', gadget.exitsouth, layercachemap, hasunderboard, 0, h)
  pushgroup(out, 'ne', gadget.exitne, layercachemap, hasunderboard, w, -h)
  pushgroup(out, 'nw', gadget.exitnw, layercachemap, hasunderboard, -w, -h)
  pushgroup(out, 'se', gadget.exitse, layercachemap, hasunderboard, w, h)
  pushgroup(out, 'sw', gadget.exitsw, layercachemap, hasunderboard, -w, h)

  if (bias.dx === 1) {
    pushgroup(
      out,
      'e2',
      gadget.exiteast2,
      layercachemap,
      hasunderboard,
      2 * w,
      0,
    )
  } else if (bias.dx === -1) {
    pushgroup(
      out,
      'w2',
      gadget.exitwest2,
      layercachemap,
      hasunderboard,
      -2 * w,
      0,
    )
  }
  if (bias.dy === -1) {
    pushgroup(
      out,
      'n2',
      gadget.exitnorth2,
      layercachemap,
      hasunderboard,
      0,
      -2 * h,
    )
  } else if (bias.dy === 1) {
    pushgroup(
      out,
      's2',
      gadget.exitsouth2,
      layercachemap,
      hasunderboard,
      0,
      2 * h,
    )
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
    board: gadget.board,
    exiteast: gadget.exiteast,
    exitwest: gadget.exitwest,
    exitnorth: gadget.exitnorth,
    exitsouth: gadget.exitsouth,
    exiteast2: gadget.exiteast2,
    exitwest2: gadget.exitwest2,
    exitnorth2: gadget.exitnorth2,
    exitsouth2: gadget.exitsouth2,
    exitne: gadget.exitne,
    exitnw: gadget.exitnw,
    exitse: gadget.exitse,
    exitsw: gadget.exitsw,
  }
}
