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
 * `zsstexttablelines`: **plain-text cells only** — column widths use JavaScript string
 * length. Embedded zsstext color codes (e.g. `$white`) inside a cell are not stripped
 * and will throw off alignment. Only the first line of a cell is used if a value
 * contains newlines.
 *
 * **CLI reference:** [`zss/firmware/cli/commands/permissions.ts`](zss/firmware/cli/commands/permissions.ts)
 * (`permissions` with no args) — `zsstexttape` → `terminalwritelines` for multiline output.
 */

import { scrolllinkescapefrag } from 'zss/mapping/string'

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

function zsstexttablecellfirstline(s: string): string {
  const line = s.split(/\r?\n/, 1)[0] ?? ''
  return line.replace(/\r$/, '')
}

function zsstexttablepadrow(row: string[], colcount: number): string[] {
  const out = row.slice()
  while (out.length < colcount) {
    out.push('')
  }
  return out.slice(0, colcount)
}

function zsstexttablehorizontalrule(widths: number[]): string {
  let s = '+'
  for (let i = 0; i < widths.length; ++i) {
    s += '-'.repeat(widths[i] + 2) + '+'
  }
  return s
}

function zsstexttablerowline(
  cells: string[],
  widths: number[],
  cellstyle: '$white' | '$gray',
): string {
  let line = ''
  for (let c = 0; c < widths.length; ++c) {
    const plain = zsstexttablecellfirstline(cells[c] ?? '')
    const padded = plain.padEnd(widths[c], ' ')
    line += `${COLOR_EDGE}| ${cellstyle}${padded} `
  }
  line += `${COLOR_EDGE}|`
  return line
}

/**
 * ASCII box table as zsstext lines: `$dkpurple` borders, `$white` header cells,
 * `$gray` body cells. Composes with `zsstexttape` / writelines.
 *
 * Cells must be plain text for correct alignment (see module note). Headers may be
 * omitted (`null` / `undefined` / empty array). Ragged rows are padded with empty
 * strings. Returns `[]` when there are no columns and no content to show.
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
      w = Math.max(w, zsstexttablecellfirstline(hdr[c] ?? '').length)
    }
    for (let r = 0; r < rows.length; ++r) {
      const row = zsstexttablepadrow(rows[r] ?? [], colcount)
      w = Math.max(w, zsstexttablecellfirstline(row[c] ?? '').length)
    }
    widths[c] = w
  }

  const rule = `${COLOR_EDGE}${zsstexttablehorizontalrule(widths)}`
  const out: string[] = []
  out.push(rule)
  if (hasheaders) {
    const hcells = zsstexttablepadrow(hdr, colcount)
    out.push(zsstexttablerowline(hcells, widths, '$white'))
    out.push(rule)
  }
  for (let r = 0; r < rows.length; ++r) {
    const rcells = zsstexttablepadrow(rows[r] ?? [], colcount)
    out.push(zsstexttablerowline(rcells, widths, '$gray'))
  }
  out.push(rule)
  return out
}
