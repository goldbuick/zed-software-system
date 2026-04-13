import type { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'

const PANEL_SPACE = 0x20
const PANEL_END_PASS_ENABLED = true

function panelbottomclamp(context: WRITE_TEXT_CONTEXT): number {
  const resetbottom = context.reset.bottomedge ?? context.height - 1
  return Math.min(resetbottom, context.height - 1)
}

/** Assumes `padlineright`, not `measureonly`, and `reset.leftedge > 0`. */
function applypanelgutterrange(
  context: WRITE_TEXT_CONTEXT,
  y0: number,
  yend: number,
) {
  const contentx = context.reset.leftedge ?? 0
  const gx = contentx - 1
  const top = context.reset.topedge ?? 0
  const bottom = panelbottomclamp(context)
  const ylo = Math.min(y0, yend)
  const yhi = Math.max(y0, yend)
  for (let yy = Math.max(ylo, top); yy <= Math.min(yhi, bottom); ++yy) {
    const si = contentx + yy * context.width
    const di = gx + yy * context.width
    context.color[di] = context.color[si]
    context.bg[di] = context.bg[si]
  }
}

export type PANEL_POST_PASS_OPTS = {
  defaultcolor: number
  defaultbg: number
  hastext: boolean
  left: number
  top: number
  bottom: number
}

/** Remainder fill + full vertical gutter sync; sole panel gutter path; no-op when flag is false. */
export function runpanelpostpass(
  context: WRITE_TEXT_CONTEXT,
  opts: PANEL_POST_PASS_OPTS,
) {
  if (!PANEL_END_PASS_ENABLED) {
    return
  }
  if (
    !opts.hastext ||
    context.padlineright !== true ||
    context.measureonly === true
  ) {
    return
  }
  const bottom = Math.min(opts.bottom, context.height - 1)
  const fillc = context.panelcarrycolor ?? opts.defaultcolor
  const fillb = context.panelcarrybg ?? opts.defaultbg
  const fillstart = context.y
  const rightpad = context.width - 1
  let touched = false
  if (fillstart <= bottom) {
    for (let y = fillstart; y <= bottom; y++) {
      const rowstart = opts.left + y * context.width
      const rowend = rightpad + y * context.width
      for (let i = rowstart; i <= rowend; i++) {
        context.char[i] = PANEL_SPACE
        context.color[i] = fillc
        context.bg[i] = fillb
      }
    }
    touched = true
  }
  const contentx = context.reset.leftedge ?? 0
  if (contentx > 0) {
    applypanelgutterrange(context, opts.top, bottom)
    touched = true
  }
  if (touched) {
    context.changed()
  }
}
