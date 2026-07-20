import type { IToken } from 'chevrotain'
import type {
  TICKER_ANCHOR,
  TICKER_BUBBLE,
  TICKER_SLOT,
  TICKER_TAIL_DIR,
} from 'zss/gadget/data/tickerlayoutstore'
import type { TICKER } from 'zss/gadget/data/types'
import { tickertileat } from 'zss/gadget/graphics/tickeranchors'
import { graphemes } from 'zss/mapping/grapheme'
import {
  EscapedDollar,
  HyperLinkText,
  MaybeFlag,
  MetaKey,
  Newline,
  NumberLiteral,
  StringLiteral,
  StringLiteralDouble,
  Whitespace,
  tokenize,
  tokenizeandmeasuretextformat,
} from 'zss/words/textformat'

/** Max bubble width in tiles (wrap beyond this). */
export const TICKER_BUBBLE_MAX_WIDTH = 28

/** Max bubble height in lines. */
export const TICKER_BUBBLE_MAX_HEIGHT = 4

/** Prefer strip lane when more than this many speakers compete for bubbles. */
export const TICKER_CROWDED_THRESHOLD = 6

export type TICKER_LAYOUT_RESULT = {
  bubbles: TICKER_BUBBLE[]
  strip: TICKER[]
  slots: Record<string, TICKER_SLOT>
}

type Rect = {
  x: number
  y: number
  w: number
  h: number
}

/** How many board cells a format token paints (0 = format-only). */
function tickervisiblecells(token: IToken): number {
  switch (token.tokenType) {
    case NumberLiteral:
    case EscapedDollar:
      return 1
    case Whitespace:
    case Newline:
      return token.image.length
    case StringLiteral:
    case HyperLinkText:
    case MaybeFlag:
    case MetaKey:
      return [...graphemes(token.image)].length
    case StringLiteralDouble:
      return [
        ...graphemes(
          token.image
            .substring(1, token.image.length - 1)
            .replaceAll('\\"', '"'),
        ),
      ].length
    default:
      return 0
  }
}

/**
 * Drop the first `count` visible cells from ticker format text (typically the
 * element icon + following space). Preserves later `$...` codes. Does not
 * byte-slice the raw string.
 */
export function tickeromitleadingvisible(text: string, count = 2): string {
  if (count <= 0 || text.length === 0) {
    return text
  }
  const result = tokenize(text)
  if (!result.tokens?.length) {
    return text
  }
  const tokens = result.tokens

  let skipped = 0
  const omit = new Set<number>()
  let firstomit = -1
  let partialindex = -1
  let partialimage = ''

  for (let i = 0; i < tokens.length; ++i) {
    const cells = tickervisiblecells(tokens[i])
    if (cells === 0) {
      continue
    }
    if (skipped >= count) {
      break
    }
    if (firstomit < 0) {
      firstomit = i
    }
    if (skipped + cells <= count) {
      omit.add(i)
      skipped += cells
      continue
    }
    // Mid-token omit: keep the trailing graphemes
    const need = count - skipped
    const token = tokens[i]
    if (
      token.tokenType === StringLiteral ||
      token.tokenType === HyperLinkText ||
      token.tokenType === MaybeFlag ||
      token.tokenType === MetaKey
    ) {
      partialimage = [...graphemes(token.image)].slice(need).join('')
    } else if (token.tokenType === StringLiteralDouble) {
      const inner = token.image
        .substring(1, token.image.length - 1)
        .replaceAll('\\"', '"')
      const rest = [...graphemes(inner)].slice(need).join('')
      partialimage = `"${rest.replaceAll('"', '\\"')}"`
    } else if (token.tokenType === Whitespace) {
      partialimage = token.image.slice(need)
    } else {
      partialimage = ''
    }
    omit.add(i)
    partialindex = i
    skipped = count
    break
  }

  if (skipped === 0) {
    return text
  }

  const parts: string[] = []
  for (let i = 0; i < tokens.length; ++i) {
    // Format-only tokens before the first omitted cell only styled the prefix
    if (
      firstomit >= 0 &&
      i < firstomit &&
      tickervisiblecells(tokens[i]) === 0
    ) {
      continue
    }
    if (!omit.has(i)) {
      parts.push(tokens[i].image)
      continue
    }
    if (i === partialindex && partialimage.length > 0) {
      parts.push(partialimage)
    }
  }
  return parts.join('')
}

function rectsoverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  )
}

function clamprect(rect: Rect, cols: number, rows: number): Rect {
  let { x, y, w, h } = rect
  w = Math.min(w, cols)
  h = Math.min(h, rows)
  x = Math.max(0, Math.min(x, cols - w))
  y = Math.max(0, Math.min(y, rows - h))
  return { x, y, w, h }
}

function measureticker(
  text: string,
  maxwidth: number,
): { width: number; height: number } {
  const measured = tokenizeandmeasuretextformat(
    text,
    maxwidth,
    TICKER_BUBBLE_MAX_HEIGHT + 2,
  )
  if (!measured) {
    return { width: Math.min(text.length, maxwidth), height: 1 }
  }
  const width = Math.max(1, Math.min(maxwidth, measured.measuredwidth || 1))
  const height = Math.max(
    1,
    Math.min(TICKER_BUBBLE_MAX_HEIGHT, measured.y || 1),
  )
  return { width, height }
}

function picktaildir(box: Rect, anchorsy: number): TICKER_TAIL_DIR {
  // Only up/down -- left/right tails are hard to read against board art
  const cy = box.y + box.h * 0.5
  const dy = anchorsy - cy
  if (Math.abs(dy) < 0.5) {
    return 'none'
  }
  return dy > 0 ? 'down' : 'up'
}

function tailtip(
  box: Rect,
  taildir: TICKER_TAIL_DIR,
  anchorsx: number,
  anchorsy: number,
): { tailx: number; taily: number } {
  // Integer tip sits on the bubble edge; sub-tile centering uses anchorsx/y at render
  const clampx = Math.max(
    box.x,
    Math.min(box.x + box.w - 1, tickertileat(anchorsx)),
  )
  const clampy = Math.max(
    box.y,
    Math.min(box.y + box.h - 1, tickertileat(anchorsy)),
  )
  switch (taildir) {
    case 'up':
      return { tailx: clampx, taily: box.y - 1 }
    case 'down':
      return { tailx: clampx, taily: box.y + box.h }
    case 'left':
      return { tailx: box.x - 1, taily: clampy }
    case 'right':
      return { tailx: box.x + box.w, taily: clampy }
    default:
      return { tailx: clampx, taily: box.y + box.h }
  }
}

/** ASCII format codes for bubble tails (ascii-user-strings). */
export function tickertailchar(taildir: TICKER_TAIL_DIR): string {
  switch (taildir) {
    case 'up':
      return '$24'
    case 'down':
      return '$25'
    case 'right':
      return '$26'
    case 'left':
      return '$27'
    default:
      return ''
  }
}

/** CP437 code point for the tail glyph (for 1x1 Tiles render). */
export function tickertailcode(taildir: TICKER_TAIL_DIR): number {
  switch (taildir) {
    case 'up':
      return 24
    case 'down':
      return 25
    case 'right':
      return 26
    case 'left':
      return 27
    default:
      return 0
  }
}

/**
 * True when this bubble's integer tip tile sits inside another bubble's panel.
 * Occluded tips are left empty so stacked dialog stays readable.
 */
export function tickertailoccluded(
  bubble: TICKER_BUBBLE,
  others: TICKER_BUBBLE[],
): boolean {
  const tipx = bubble.tailx
  const tipy = bubble.taily
  for (let i = 0; i < others.length; ++i) {
    const other = others[i]
    if (other.id === bubble.id) {
      continue
    }
    if (
      tipx >= other.tilex &&
      tipx < other.tilex + other.width &&
      tipy >= other.tiley &&
      tipy < other.tiley + other.height
    ) {
      return true
    }
  }
  return false
}

/**
 * True when every ticker id has an entry in anchors (projector has published).
 * Missing keys mean "not ready yet" -- do not layout (avoids strip flash).
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
 * Greedy vertical-stacking bubble packer with slot memory.
 * Explicit visible:false / over-capacity speakers go to the strip lane.
 * Missing anchor keys are skipped (caller should gate with tickeranchorsready).
 */
export function layouttickers(args: {
  tickers: TICKER[]
  anchors: Record<string, TICKER_ANCHOR>
  cols: number
  rows: number
  priorslots?: Record<string, TICKER_SLOT>
  crowdedthreshold?: number
}): TICKER_LAYOUT_RESULT {
  const {
    tickers,
    anchors,
    cols,
    rows,
    priorslots = {},
    crowdedthreshold = TICKER_CROWDED_THRESHOLD,
  } = args

  const bubbles: TICKER_BUBBLE[] = []
  const strip: TICKER[] = []
  const slots: Record<string, TICKER_SLOT> = {}
  const placed: Rect[] = []

  if (cols < 8 || rows < 6) {
    return { bubbles, strip: [...tickers], slots }
  }

  const candidates: {
    ticker: TICKER
    anchor: TICKER_ANCHOR
    width: number
    height: number
    bubbletext: string
  }[] = []

  for (let i = 0; i < tickers.length; ++i) {
    const ticker = tickers[i]
    const anchor = anchors[ticker.id]
    // Missing key: not published yet -- skip (do not strip)
    if (!anchor) {
      continue
    }
    // Explicit invisible: strip lane
    if (!anchor.visible) {
      strip.push(ticker)
      continue
    }
    const bubbletext = tickeromitleadingvisible(ticker.text)
    const { width, height } = measureticker(bubbletext, TICKER_BUBBLE_MAX_WIDTH)
    if (height > TICKER_BUBBLE_MAX_HEIGHT) {
      strip.push(ticker)
      continue
    }
    candidates.push({ ticker, anchor, width, height, bubbletext })
  }

  if (candidates.length > crowdedthreshold) {
    // keep newest-listed first as bubbles; rest to strip
    // tickers arrive in board scan order; keep first N, strip the rest
    const overflow = candidates.splice(crowdedthreshold)
    for (let i = 0; i < overflow.length; ++i) {
      strip.push(overflow[i].ticker)
    }
  }

  // place nearest-to-bottom first so stacking pushes upward
  candidates.sort((a, b) => b.anchor.sy - a.anchor.sy)

  // Reserve every active speaker so no panel covers a talking sprite
  for (let i = 0; i < candidates.length; ++i) {
    const { anchor } = candidates[i]
    placed.push({
      x: tickertileat(anchor.sx),
      y: tickertileat(anchor.sy),
      w: 1,
      h: 1,
    })
  }

  for (let i = 0; i < candidates.length; ++i) {
    const { ticker, anchor, width, height, bubbletext } = candidates[i]
    const prior = priorslots[ticker.id]
    // Same floor mapping as sx -- Math.round(N+0.5) is N+1 in JS and shifts Y by +1
    const speakery = tickertileat(anchor.sy)

    // Center the integer bubble on the continuous speaker x
    const speakerx = tickertileat(anchor.sx)
    const ownspeaker: Rect = { x: speakerx, y: speakery, w: 1, h: 1 }
    let preferx = Math.round(anchor.sx - width * 0.5)
    let prefery = speakery - height - 2

    if (prior) {
      const dx = Math.abs(prior.tilex + width * 0.5 - anchor.sx)
      const dy = Math.abs(prior.tiley + height - anchor.sy)
      const priorrect = { x: prior.tilex, y: prior.tiley, w: width, h: height }
      const overlapspeaker = rectsoverlap(priorrect, ownspeaker)
      // Tight dx: stale slots from earlier offset bugs must not stick
      if (dx < 1.5 && dy < 5 && !overlapspeaker) {
        preferx = prior.tilex
        prefery = prior.tiley
      }
    }

    const attempts: Rect[] = []
    for (let lift = 0; lift < rows; ++lift) {
      attempts.push({ x: preferx, y: prefery - lift, w: width, h: height })
    }
    attempts.push({
      x: preferx,
      y: speakery + 2,
      w: width,
      h: height,
    })
    for (const nudge of [-3, 3, -6, 6, -10, 10]) {
      attempts.push({
        x: preferx + nudge,
        y: prefery,
        w: width,
        h: height,
      })
    }

    let placedrect: Rect | undefined
    for (let a = 0; a < attempts.length; ++a) {
      const clamped = clamprect(attempts[a], cols, rows)
      let hits = false
      for (let p = 0; p < placed.length; ++p) {
        if (rectsoverlap(clamped, placed[p])) {
          hits = true
          break
        }
      }
      if (!hits) {
        placedrect = clamped
        break
      }
    }

    if (!placedrect) {
      strip.push(ticker)
      continue
    }

    placed.push(placedrect)
    slots[ticker.id] = { tilex: placedrect.x, tiley: placedrect.y }
    const taildir = picktaildir(placedrect, anchor.sy)
    const tip = tailtip(placedrect, taildir, anchor.sx, anchor.sy)
    bubbles.push({
      id: ticker.id,
      tilex: placedrect.x,
      tiley: placedrect.y,
      width: placedrect.w,
      height: placedrect.h,
      text: bubbletext,
      taildir,
      tailx: tip.tailx,
      taily: tip.taily,
      anchorsx: anchor.sx,
      anchorsy: anchor.sy,
    })
  }

  return { bubbles, strip, slots }
}
