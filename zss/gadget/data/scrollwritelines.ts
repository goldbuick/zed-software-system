import { parsezedlinkline } from 'zss/feature/zedlinkparse'
import { iszedlinkline } from 'zss/feature/zsstextui'
import {
  gadgetcheckqueue,
  gadgethyperlink,
  gadgetstate,
  gadgettext,
} from 'zss/gadget/data/api'

/** One Zed scroll line `!cmd args;label` (optional `!@chip …`) → `gadgethyperlink`. No-op if not a bang hyperlink line. */
export function gadgethyperlinkfromzedline(
  player: string,
  line: string,
  chip = 'refscroll',
): void {
  const parsed = parsezedlinkline(line, chip)
  if (!parsed || !iszedlinkline(line.trim())) {
    return
  }
  gadgethyperlink(player, parsed.chip, parsed.label, parsed.words)
}

/** Whitespace-only physical lines become blank scroll rows (`gadgettext` empty string). */
export function scrollwritelines(
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
    if (iszedlinkline(line)) {
      gadgethyperlinkfromzedline(player, line, chip)
    } else {
      gadgettext(player, line)
    }
  }
  shared.scroll = gadgetcheckqueue(player)
}
