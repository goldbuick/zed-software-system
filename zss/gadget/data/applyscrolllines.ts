import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { NAME } from 'zss/words/types'

/** Zed `NumberLiteral` for ASCII `;` (59); use inside `!left;right` when payload or label contains a semicolon. */
const SCROLL_SEMI_ZED = '$59'

/** Escape `;` for storage in the command or label segment of a bang scroll line. */
export function scrolllinkescapefrag(s: string): string {
  return s.replaceAll(';', SCROLL_SEMI_ZED)
}

/** Undo `scrolllinkescapefrag` after splitting on the first raw `;`. `$590` etc. stay unchanged. */
export function scrolllinkunescapefrag(s: string): string {
  return s.replace(/\$59(?!\d)/g, ';')
}

function pushscrollhyperlink(
  player: string,
  chip: string,
  leftwithbang: string,
  label: string,
) {
  const parts = leftwithbang.trimStart().slice(1).split(' ')
  const second = NAME(parts[1] ?? '')
  switch (second) {
    case 'hk':
    case 'hotkey':
      gadgethyperlink(player, chip, label, [
        parts[0] ?? '',
        parts[1] ?? '',
        parts[2] ?? '',
        ` ${parts[3] ?? ''} `,
        parts[4] ?? '',
      ])
      break
    default:
      gadgethyperlink(player, chip, label, parts)
      break
  }
}

export function gadgetapplyscrolllines(
  player: string,
  scrollname: string,
  content: string,
  chip = 'refscroll',
): void {
  const shared = gadgetstate(player)
  shared.scrollname = scrollname
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
      pushscrollhyperlink(player, chip, left, label)
    } else {
      gadgettext(player, line)
    }
  }
  shared.scroll = gadgetcheckqueue(player)
}
