import type { DEVICELIKE } from 'zss/device/api'
import { write, writehyperlink } from 'zss/feature/writeui'
import { scrolllinkunescapefrag } from 'zss/gadget/data/applyscrolllines'

/**
 * Terminal/write analogue of gadgetapplyscrolllines: same newline handling,
 * empty-line skip, scrolllinkunescapefrag, and !payload;label vs plain zetext.
 *
 * @param chip Reserved for API parity with gadgetapplyscrolllines; currently unused.
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
      continue
    }
    if (line.startsWith('!') && line.includes(';')) {
      const semi = line.indexOf(';')
      const left = scrolllinkunescapefrag(line.slice(0, semi).trimEnd())
      const label = scrolllinkunescapefrag(line.slice(semi + 1).trim())
      writehyperlink(device, player, left.trimStart().slice(1), label)
    } else {
      write(device, player, line)
    }
  }
}
