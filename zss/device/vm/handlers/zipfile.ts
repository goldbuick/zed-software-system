import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  markzipfilelistitem,
  readzipfilelist,
  readzipfilelistitem,
} from 'zss/feature/parse/file'
import { applyzedscroll } from 'zss/feature/parse/markdownscroll'
import { registerhyperlinksharedbridge } from 'zss/gadget/data/api'
import { scrolllinkescapefrag } from 'zss/gadget/data/scrollwritelines'
import { NAME } from 'zss/words/types'

registerhyperlinksharedbridge(
  'zipfilelist',
  'select',
  (name) => (readzipfilelistitem(name) ? 1 : 0),
  (name, value) => markzipfilelistitem(name, !!value),
)

// Terminal tape lines that bind the same modem keys as this scroll should use
// `!zipfilelist:<filename>!select;…` (second `!` separates `paneladdress` prefix
// from the command). Targets must not contain `:`.
//
// Select rows quote the filename so `scrolllinksplittokens` keeps one target token
// (spaces, multiple words) for `PanelSelect` and for `readzipfilelistitem` keys.

function quotezipscrollselecttarget(name: string): string {
  let buf = ''
  for (let i = 0; i < name.length; ++i) {
    const c = name.charAt(i)
    if (c === '\\' || c === '"') {
      buf += `\\${c}`
    } else {
      buf += c
    }
  }
  return `"${buf}"`
}

export function handlereadzipfilelist(_vm: DEVICE, message: MESSAGE): void {
  const list = readzipfilelist()
  const lines: string[] = []
  lines.push('$CENTER Select Files')
  lines.push(`!importfiles;${scrolllinkescapefrag('import selected')}`)
  for (let i = 0; i < list.length; ++i) {
    const [type, filename] = list[i]
    if (!type) {
      continue
    }
    lines.push(filename)
    const fname = NAME(filename)
    const cmd = `${quotezipscrollselecttarget(fname)} select NO 0 YES 1`
    const label = `$cyan[${type}]$white`
    lines.push(`!${scrolllinkescapefrag(cmd)};${scrolllinkescapefrag(label)}`)
  }
  applyzedscroll(message.player, lines.join('\n'), 'zipfilelist', 'zipfilelist')
}
