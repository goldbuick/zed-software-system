import type { DEVICELIKE } from 'zss/device/types'
import { write } from 'zss/feature/writeui'
import { parsezedlinkline } from 'zss/feature/zedlinkparse'
import {
  iszedlinkline,
  zsszedlinkline,
  zsszedlinklinechip,
} from 'zss/feature/zsstextui'
import { scrolllinkescapefrag } from 'zss/mapping/string'

function quotetoken(token: string): string {
  if (!/[\s"]/.test(token)) {
    return token
  }
  let buf = ''
  for (let i = 0; i < token.length; ++i) {
    const c = token.charAt(i)
    if (c === '\\' || c === '"') {
      buf += `\\${c}`
    } else {
      buf += c
    }
  }
  return `"${buf}"`
}

function joincommandwords(words: string[]): string {
  const parts: string[] = []
  for (let i = 0; i < words.length; ++i) {
    parts.push(quotetoken(words[i]))
  }
  return parts.join(' ')
}

/**
 * Terminal/write analogue of scrollwritelines: same newline handling,
 * blank lines as empty log rows, and `!payload;label` vs plain zsstext via
 * shared `parsezedlinkline` (first `;`, `$59` escapes, optional `!@chip`).
 *
 * When `chip` is set and the line has no `!@chip`, the line is rewritten with
 * `zsszedlinklinechip` so terminal render can resolve the chip.
 */
export function terminalwritelines(
  device: DEVICELIKE,
  player: string,
  content: string,
  chip = 'refscroll',
): void {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()
    if (!line.length) {
      write(device, player, '')
      continue
    }
    if (iszedlinkline(line)) {
      const parsed = parsezedlinkline(line, chip)
      if (!parsed) {
        write(device, player, line)
        continue
      }
      const cmd = joincommandwords(parsed.words)
      if (parsed.modemprefix) {
        write(
          device,
          player,
          `!${scrolllinkescapefrag(parsed.modemprefix)}!${scrolllinkescapefrag(cmd)};${scrolllinkescapefrag(parsed.label)}`,
        )
      } else if (chip !== 'refscroll' || line.trimStart().startsWith('!@')) {
        write(device, player, zsszedlinklinechip(parsed.chip, cmd, parsed.label))
      } else {
        write(device, player, zsszedlinkline(cmd, parsed.label))
      }
    } else {
      write(device, player, line)
    }
  }
}
