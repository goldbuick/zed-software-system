import {
  MarkdownZedSink,
  parsemarkdownwithzsstextsink,
} from 'zss/feature/parse/markdownzsstext'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'
import { scrolllinkescapefrag } from 'zss/mapping/string'

function banglinkrow(command: string, label: string): string {
  return `!${scrolllinkescapefrag(command)};${scrolllinkescapefrag(label)}`
}

function createscrollsink(lines: string[]): MarkdownZedSink {
  return {
    line: (s: string) => {
      lines.push(s)
    },
    hyperlink: (command: string, label: string) => {
      lines.push(banglinkrow(command, label))
    },
  }
}

export function scrollwritemarkdownlines(
  player: string,
  content: string,
  scrollname: string,
  chip = 'refscroll',
) {
  const lines: string[] = []
  parsemarkdownwithzsstextsink(createscrollsink(lines), content)
  scrollwritelines(player, scrollname, lines.join('\n'), chip)
}
