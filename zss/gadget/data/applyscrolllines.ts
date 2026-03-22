import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'
import { NAME } from 'zss/words/types'

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
      const left = line.slice(0, semi).trimEnd()
      const label = line.slice(semi + 1).trim()
      pushscrollhyperlink(player, chip, left, label)
    } else {
      gadgettext(player, line)
    }
  }
  shared.scroll = gadgetcheckqueue(player)
}
