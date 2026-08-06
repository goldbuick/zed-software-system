import type {
  TICKER_ANCHOR,
  TICKER_SLOT,
} from 'zss/gadget/data/tickerlayoutstore'
import type { TICKER } from 'zss/gadget/data/types'

export type TICKER_LAYOUT_RESULT = {
  bubbles: []
  strip: TICKER[]
  slots: Record<string, TICKER_SLOT>
}

/**
 * Sort tickers newest-first (higher tickertime first). Stable by id on ties.
 */
export function sorttickersnewestfirst(tickers: TICKER[]): TICKER[] {
  return [...tickers].sort((a, b) => {
    const dt = b.tickertime - a.tickertime
    if (dt !== 0) {
      return dt
    }
    if (a.id < b.id) {
      return -1
    }
    if (a.id > b.id) {
      return 1
    }
    return 0
  })
}

/**
 * True when every ticker id has an entry in anchors (projector has published).
 * List layout no longer requires anchors; kept for callers that still gate.
 */
export function tickeranchorsready(
  tickers: TICKER[],
  anchors: Record<string, TICKER_ANCHOR>,
): boolean {
  for (let i = 0; i < tickers.length; ++i) {
    if (!(tickers[i].id in anchors)) {
      return false
    }
  }
  return true
}

/**
 * List-only ticker layout: no speech bubbles. Strip is newest-first.
 */
export function layouttickers(args: {
  tickers: TICKER[]
  anchors?: Record<string, TICKER_ANCHOR>
  cols?: number
  rows?: number
  playertiles?: TICKER_SLOT[]
  crowdedthreshold?: number
}): TICKER_LAYOUT_RESULT {
  void args.anchors
  void args.cols
  void args.rows
  void args.playertiles
  void args.crowdedthreshold
  return {
    bubbles: [],
    strip: sorttickersnewestfirst(args.tickers),
    slots: {},
  }
}
