import { SOFTWARE } from 'zss/device/session'
import {
  MarkdownZedSink,
  parsemarkdownwithzsstextsink,
} from 'zss/feature/parse/markdownzsstext'
import { scrolllinkescapefrag } from 'zss/mapping/string'

import { terminalwritelines } from '../terminalwritelines'

function banglinkrow(command: string, label: string): string {
  return `!${scrolllinkescapefrag(command)};${scrolllinkescapefrag(label)}`
}

function createterminalsink(lines: string[]): MarkdownZedSink {
  return {
    line: (s: string) => {
      lines.push(s)
    },
    hyperlink: (command: string, label: string) => {
      lines.push(banglinkrow(command, label))
    },
  }
}

export function terminalwritemarkdownlines(player: string, content: string) {
  const lines: string[] = []
  parsemarkdownwithzsstextsink(createterminalsink(lines), content)
  terminalwritelines(SOFTWARE, player, lines.join('\n'))
}
