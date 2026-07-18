import type { WanixTermTileBuffer } from 'zss/device/wanixclient/state'

import { readwanixtermlinecell } from './wanixtermclipboard'

export type DumpWanixTermBufferOpts = {
  tail?: number
  viewportonly?: boolean
  includescrollback?: boolean
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
