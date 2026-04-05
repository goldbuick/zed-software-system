import {
  MarkdownZedSink,
  parsemarkdownwithzsstextsink,
} from 'zss/feature/parse/markdownzsstext'
import { zsszedlinkline } from 'zss/feature/zsstextui'
import { scrollwritelines } from 'zss/gadget/data/scrollwritelines'

function createscrollsink(lines: string[]): MarkdownZedSink {
  return {
    line: (s: string) => {
      lines.push(s)
    },
    hyperlink: (command: string, label: string) => {
      lines.push(zsszedlinkline(command, label))
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
