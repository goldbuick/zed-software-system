/**
 * Pure zsstext line builders for terminal (`write`) and scroll (`gadgettext`).
 * Layout constants, bar/header/section/option rows, tape join helpers, and
 * escaped `!command;label` rows live here.
 *
 * Tape for bulk sinks: build multiline strings with `zsstexttape` and optional
 * `zsszedlinkline` / `zsszedlinklinechip` rows, then pass to `terminalwritelines`
 * or `scrollwritelines` (same newline / `!payload;label` rules). Use `iszedlinkline`
 * to detect hyperlink rows after trim. Fragment escaping for custom segments stays
 * in `zss/mapping/string` (`scrolllinkescapefrag`); do not re-export that helper here.
 *
 * `zsstexttablelines`: rule lines use CP437 top / middle / bottom corners (`$218`…`$191`,
 * `$195`…`$180`, `$192`…`$217`). Column widths use **drawn** width (zsstext measure-only render),
 * so embedded color codes in cells do not count toward width. Padding appends plain
 * spaces after each wrapped segment. Only the first line of a cell is used if a value
 * contains newlines (content after `\n` is ignored). The table border is capped so its
 * rule line fits in `BOARD_WIDTH` (60); over-wide columns are shrunk and cell text
 * wraps (word breaks on spaces when possible, otherwise hard breaks on drawn width).
 *
 * **CLI reference:** [`zss/firmware/cli/commands/permissions.ts`](zss/firmware/cli/commands/permissions.ts)
 * (`permissions` with no args) — `zsstexttape` → `terminalwritelines` for multiline output.
 * Table body/header rows alternate `$ondkblue` / `$onblack` backgrounds (stripe 0 = dkblue).
 */

import { scrolllinkescapefrag } from 'zss/mapping/string'
import { BOARD_WIDTH } from 'zss/memory/types'
import { tokenizeandmeasuretextformat } from 'zss/words/textformat'

const COLOR_EDGE = '$dkpurple'

const CHR_TM = '$196'
const CHR_BM = '$205'

export const DIVIDER = '$yellow$205$205$205$196'
export const DOWN_SPOUT = '$196$191'
export const UP_SPOUT = '$192$196'

export function zsstbarline(width: number): string {
  return `${COLOR_EDGE}${CHR_TM.repeat(width)}`
}

export function zssbbarline(width: number): string {
  return `${COLOR_EDGE}${CHR_BM.repeat(width)}`
}

export function zssheaderlines(header: string): string[] {
  const width = zssboxinnerwidth(header)
  return [
    zsstbarline(width),
    `${COLOR_EDGE} $white${header} `,
    zssbbarline(width),
  ]
}

export function zsssectionlines(section: string): string[] {
  const width = zssboxinnerwidth(section)
  return [
    `${COLOR_EDGE} ${' '.repeat(section.length)} `,
    `${COLOR_EDGE} $gray${section} `,
    zssbbarline(width),
  ]
}

export function zssoptionline(option: string, label: string): string {
  return `${COLOR_EDGE} $white${option} $blue${label}`
}

export function zsstextline(text: string): string {
  return `${COLOR_EDGE}$blue${text}`
}

/** Inner width (between edge bars) for `zssheaderlines` / `zsssectionlines` boxes. */
export function zssboxinnerwidth(title: string): number {
  return title.length + 2
}

/** After `trim`, whether the line is a Zed tape hyperlink row `!…;…`. */
export function iszedlinkline(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('!') && trimmed.includes(';')
}

/** One Zed tape hyperlink row `!command;label` with `;` escaped in both segments. */
export function zsszedlinkline(command: string, label: string): string {
  return `!${scrolllinkescapefrag(command)};${scrolllinkescapefrag(label)}`
}

/**
 * Scroll tape only: one line `!@chip command;label` with `;` escaped in the command
 * and label fragments. Not for terminal logs — `terminalwritelines` does not apply
 * per-line chip routing (its `chip` argument is reserved / unused).
 */
export function zsszedlinklinechip(
  chip: string,
  command: string,
  label: string,
): string {
  return `!@${chip} ${scrolllinkescapefrag(command)};${scrolllinkescapefrag(label)}`
}

/** Maps `{ command, label }` rows to `zsszedlinkline` strings. */
export function zsszedlinklines(
  rows: { command: string; label: string }[],
): string[] {
  const out: string[] = []
  for (let i = 0; i < rows.length; ++i) {
    const row = rows[i]
    out.push(zsszedlinkline(row.command, row.label))
  }
  return out
}

/**
 * Joins line groups into one newline-separated tape string for `terminalwritelines` /
 * `scrollwritelines`. Each string is one line; each array expands to its lines in order.
 */
export function zsstexttape(...parts: (string | string[])[]): string {
  const out: string[] = []
  for (let p = 0; p < parts.length; ++p) {
    const part = parts[p]
    if (Array.isArray(part)) {
      for (let i = 0; i < part.length; ++i) {
        out.push(part[i])
      }
    } else {
      out.push(part)
    }
  }
  return out.join('\n')
}

const ZSSTEXT_TABLE_MEASURE_WIDTH = 8192

function zsstexttablecellfirstline(s: string): string {
  const line = s.split(/\r?\n/, 1)[0] ?? ''
  return line.replace(/\r$/, '')
}

/** Display width of the first line as zsstext would render (colors do not add columns). */
function zsstextfirstlinedrawnwidth(s: string): number {
  const line = zsstexttablecellfirstline(s)
  if (line.length === 0) {
    return 0
  }
  const ctx = tokenizeandmeasuretextformat(line, ZSSTEXT_TABLE_MEASURE_WIDTH, 1)
  if (!ctx) {
    return 0
  }
  return ctx.measuredwidth
}

/** Split the cell’s first line into segments of at most `maxdrawn` drawn width. */
function zsstextwrapfirstlinetowidth(line: string, maxdrawn: number): string[] {
  const lin = zsstexttablecellfirstline(line)
  if (maxdrawn <= 0) {
    return ['']
  }
  if (lin.length === 0) {
    return ['']
  }
  if (zsstextfirstlinedrawnwidth(lin) <= maxdrawn) {
    return [lin]
  }
  const out: string[] = []
  let rest = lin
  while (rest.length > 0) {
    if (zsstextfirstlinedrawnwidth(rest) <= maxdrawn) {
      out.push(rest)
      break
    }
    let lo = 0
    let hi = rest.length
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2)
      if (zsstextfirstlinedrawnwidth(rest.slice(0, mid)) <= maxdrawn) {
        lo = mid
      } else {
        hi = mid - 1
      }
    }
    let take = lo
    if (take === 0) {
      take = 1
      while (
        take < rest.length &&
        zsstextfirstlinedrawnwidth(rest.slice(0, take)) === 0
      ) {
        take++
      }
    }
    const chunk = rest.slice(0, take)
    const sp = chunk.lastIndexOf(' ')
    if (
      sp > 0 &&
      zsstextfirstlinedrawnwidth(rest.slice(0, sp)) <= maxdrawn &&
      zsstextfirstlinedrawnwidth(rest.slice(0, sp)) > 0
    ) {
      out.push(rest.slice(0, sp))
      rest = rest.slice(sp + 1)
      while (rest.startsWith(' ')) {
        rest = rest.slice(1)
      }
    } else {
      out.push(chunk)
      rest = rest.slice(take)
    }
  }
  return out
}

/** Max sum of column content widths so `+---+` rule length ≤ `BOARD_WIDTH` (`1+sum+3n`). */
function zsstexttablemaxsumforrule(colcount: number): number {
  return Math.max(0, BOARD_WIDTH - 1 - 3 * colcount)
}

function zsstexttableclampwidths(widths: number[]): number[] {
  const n = widths.length
  if (n === 0) {
    return widths
  }
  const maxsum = zsstexttablemaxsumforrule(n)
  let s = 0
  for (let i = 0; i < n; ++i) {
    s += widths[i]
  }
  if (s <= maxsum) {
    return widths.slice()
  }
  const out = widths.slice()
  let deficit = s - maxsum
  while (deficit > 0) {
    let mi = 0
    let mv = out[0]
    for (let c = 1; c < n; ++c) {
      if (out[c] > mv) {
        mv = out[c]
        mi = c
      }
    }
    if (mv === 0) {
      break
    }
    out[mi]--
    deficit--
  }
  return out
}

function zsstexttablepadrow(row: string[], colcount: number): string[] {
  const out = row.slice()
  while (out.length < colcount) {
    out.push('')
  }
  return out.slice(0, colcount)
}

/** Horizontal rule row: top / header–body separator / bottom (CP437 box drawing). */
function zsstexttablehorizontalrule(
  widths: number[],
  position: 'top' | 'middle' | 'bottom',
): string {
  const n = widths.length
  if (n === 0) {
    return ''
  }
  let left: string
  let between: string
  let right: string
  if (position === 'top') {
    left = '$218'
    between = '$194'
    right = '$191'
  } else if (position === 'middle') {
    left = '$195'
    between = '$197'
    right = '$180'
  } else {
    left = '$192'
    between = '$193'
    right = '$217'
  }
  let s = left
  for (let i = 0; i < n; ++i) {
    s += '$196'.repeat(widths[i] + 2)
    if (i < n - 1) {
      s += between
    } else {
      s += right
    }
  }
  return s
}

function zsstexttablerowlines(
  cells: string[],
  widths: number[],
  cellstyle: '$white' | '$gray',
): string[] {
  const colcount = widths.length
  const wrapped: string[][] = []
  for (let c = 0; c < colcount; ++c) {
    wrapped[c] = zsstextwrapfirstlinetowidth(cells[c] ?? '', widths[c])
  }
  let rowcount = 1
  for (let c = 0; c < colcount; ++c) {
    rowcount = Math.max(rowcount, wrapped[c].length)
  }
  const lines: string[] = []
  for (let i = 0; i < rowcount; ++i) {
    let line = ``
    for (let c = 0; c < colcount; ++c) {
      const rowline = wrapped[c][i] ?? ''
      const dw = zsstextfirstlinedrawnwidth(rowline)
      const pad = Math.max(0, widths[c] - dw)
      const padded = `${rowline}${' '.repeat(pad)}`
      line += `${COLOR_EDGE}$179 ${cellstyle}${padded} `
    }
    line += `${COLOR_EDGE}$179`
    lines.push(line)
  }
  return lines
}

/**
 * ASCII box table as zsstext lines: `$dkpurple` borders, `$white` header cells,
 * `$gray` body cells, alternating row backgrounds `$ondkblue` / `$onblack` (header is
 * stripe 0). Composes with `zsstexttape` / writelines.
 *
 * Cells may include zsstext color tokens; widths follow drawn columns. Headers may be
 * omitted (`null` / `undefined` / empty array). Ragged rows are padded with empty
 * strings. Long cells wrap to extra lines within the row. Returns `[]` when there are
 * no columns and no content to show.
 */
export function zsstexttablelines(
  rows: string[][],
  headers?: string[] | null,
): string[] {
  const hdr = headers ?? []
  const hasheaders = hdr.length > 0
  let colcount = 0
  if (hasheaders) {
    colcount = hdr.length
  }
  for (let r = 0; r < rows.length; ++r) {
    colcount = Math.max(colcount, rows[r].length)
  }
  if (colcount === 0) {
    return []
  }

  const widths: number[] = []
  for (let c = 0; c < colcount; ++c) {
    let w = 0
    if (hasheaders) {
      w = Math.max(w, zsstextfirstlinedrawnwidth(hdr[c] ?? ''))
    }
    for (let r = 0; r < rows.length; ++r) {
      const row = zsstexttablepadrow(rows[r] ?? [], colcount)
      w = Math.max(w, zsstextfirstlinedrawnwidth(row[c] ?? ''))
    }
    widths[c] = w
  }

  const widthsclamped = zsstexttableclampwidths(widths)

  const ruletop = `${COLOR_EDGE}${zsstexttablehorizontalrule(widthsclamped, 'top')}`
  const rulemiddle = `${COLOR_EDGE}${zsstexttablehorizontalrule(widthsclamped, 'middle')}`
  const rulebottom = `${COLOR_EDGE}${zsstexttablehorizontalrule(widthsclamped, 'bottom')}`
  const out: string[] = []
  out.push(ruletop)
  if (hasheaders) {
    const hcells = zsstexttablepadrow(hdr, colcount)
    out.push(...zsstexttablerowlines(hcells, widthsclamped, '$white'))
    out.push(rulemiddle)
  }
  for (let r = 0; r < rows.length; ++r) {
    const rcells = zsstexttablepadrow(rows[r] ?? [], colcount)
    out.push(...zsstexttablerowlines(rcells, widthsclamped, '$gray'))
  }
  out.push(rulebottom)
  return out
}
