import type { DEVICELIKE } from 'zss/device/api'
import { iszedlinkline } from 'zss/feature/zsstextui'
import { write, writehyperlink } from 'zss/feature/writeui'
import { scrolllinkunescapefrag } from 'zss/mapping/string'

/**
 * Terminal/write analogue of scrollwritelines: same newline handling,
 * blank lines (empty / whitespace-only physical lines) as empty log rows,
 * `scrolllinkunescapefrag` from `zss/mapping/string`, and !payload;label vs plain zsstext.
 *
 * @param chip Reserved for API parity with scrollwritelines; currently unused.
 */
export function terminalwritelines(
  device: DEVICELIKE,
  player: string,
  content: string,
  chip = 'refscroll',
): void {
  void chip
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim()
    if (!line.length) {
      write(device, player, '')
      continue
    }
    if (iszedlinkline(line)) {
      const semi = line.indexOf(';')
      const left = scrolllinkunescapefrag(line.slice(0, semi).trimEnd())
      const label = scrolllinkunescapefrag(line.slice(semi + 1).trim())
      writehyperlink(device, player, left.trimStart().slice(1), label)
    } else {
      write(device, player, line)
    }
  }
}
