import {
  MarkdownZedSink,
  parsemarkdownwithzetextsink,
} from 'zss/feature/parse/markdownzetext'
import { gadgethyperlink, gadgettext } from 'zss/gadget/data/api'
import { NAME } from 'zss/words/types'

function createlink(player: string, link: string, label: string) {
  const parts = link.split(' ')
  const start = NAME(parts[0] ?? '')
  switch (start) {
    case 'copyit':
      gadgethyperlink(player, 'refscroll', label, [
        '',
        parts[0] ?? '',
        parts[1] ?? '',
      ])
      break
    default: {
      const second = NAME(parts[1] ?? '')
      switch (second) {
        case 'hk':
        case 'hotkey':
          gadgethyperlink(player, 'refscroll', label, [
            parts[0] ?? '',
            parts[1] ?? '',
            parts[2] ?? '',
            ` ${parts[3] ?? ''} `,
            parts[4] ?? '',
          ])
          break
        default:
          gadgethyperlink(player, 'refscroll', label, [parts[0] ?? ''])
          break
      }
      break
    }
  }
}

function createscrollsink(player: string): MarkdownZedSink {
  return {
    line: (s: string) => gadgettext(player, s),
    hyperlink: (command: string, label: string) => {
      createlink(player, command, label)
    },
  }
}

export function parsemarkdownforscroll(player: string, content: string) {
  parsemarkdownwithzetextsink(createscrollsink(player), content)
}
