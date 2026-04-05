import { SOFTWARE } from 'zss/device/session'
import {
  MarkdownZedSink,
  parsemarkdownwithzsstextsink,
} from 'zss/feature/parse/markdownzsstext'
import { zsszedlinkline } from 'zss/feature/zsstextui'

import { terminalwritelines } from '../terminalwritelines'

function createterminalsink(lines: string[]): MarkdownZedSink {
  return {
    line: (s: string) => {
      lines.push(s)
    },
    hyperlink: (command: string, label: string) => {
      lines.push(zsszedlinkline(command, label))
    },
  }
}

export function terminalwritemarkdownlines(player: string, content: string) {
  const lines: string[] = []
  parsemarkdownwithzsstextsink(createterminalsink(lines), content)
  terminalwritelines(SOFTWARE, player, lines.join('\n'))
}
