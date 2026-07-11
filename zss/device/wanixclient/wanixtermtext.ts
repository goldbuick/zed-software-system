import type { WanixTermTileBuffer } from './wanixtermbuffer'
import { readwanixtermlinecell } from './wanixtermclipboard'

export type DumpWanixTermBufferOpts = {
  tail?: number
  viewportonly?: boolean
  includescrollback?: boolean
}

export type WanixTermSearchMatch = {
  line: number
  col: number
  match: string
}

function trimtrailinglinechars(line: string) {
  return line.replace(/ +$/, '')
}

export function readwanixtermtotallines(buffer: WanixTermTileBuffer): number {
  return (buffer.scrollbackrows ?? 0) + buffer.rows
}

export function readwanixtermlinestring(
  buffer: WanixTermTileBuffer,
  lineindex: number,
): string {
  let text = ''
  for (let col = 0; col < buffer.cols; col++) {
    const ch = readwanixtermlinecell(buffer, lineindex, col).char
    text += ch >= 32 && ch <= 126 ? String.fromCharCode(ch) : ' '
  }
  return trimtrailinglinechars(text)
}

export function dumpwanixtermbuffertext(
  buffer: WanixTermTileBuffer,
  opts?: DumpWanixTermBufferOpts,
): string {
  const viewportonly = opts?.viewportonly === true
  const includescrollback = opts?.includescrollback !== false
  const scrollbackrows = buffer.scrollbackrows ?? 0
  const startline = viewportonly
    ? scrollbackrows
    : includescrollback
      ? 0
      : scrollbackrows
  const endline = readwanixtermtotallines(buffer)
  const lines: string[] = []
  for (let line = startline; line < endline; line++) {
    lines.push(readwanixtermlinestring(buffer, line))
  }
  if (opts?.tail != null && opts.tail > 0 && lines.length > opts.tail) {
    return lines.slice(-opts.tail).join('\n')
  }
  return lines.join('\n')
}

export function searchwanixtermbuffer(
  buffer: WanixTermTileBuffer,
  pattern: string | RegExp,
): WanixTermSearchMatch[] {
  const matches: WanixTermSearchMatch[] = []
  const totallines = readwanixtermtotallines(buffer)
  for (let line = 0; line < totallines; line++) {
    const text = readwanixtermlinestring(buffer, line)
    if (typeof pattern === 'string') {
      let index = text.indexOf(pattern)
      while (index >= 0) {
        matches.push({ line, col: index, match: pattern })
        index = text.indexOf(pattern, index + 1)
      }
      continue
    }
    const re = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    )
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) != null) {
      matches.push({ line, col: match.index, match: match[0] })
      if (match[0].length === 0) {
        re.lastIndex += 1
      }
    }
  }
  return matches
}

export function assertwanixtermcontains(
  buffer: WanixTermTileBuffer,
  text: string,
): boolean {
  return dumpwanixtermbuffertext(buffer).includes(text)
}
