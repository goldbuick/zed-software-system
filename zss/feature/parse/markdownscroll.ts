import {
  MarkdownZedSink,
  parsemarkdownwithzetextsink,
} from 'zss/feature/parse/markdownzetext'
import {
  gadgetapplyscrolllines,
  scrolllinkescapefrag,
} from 'zss/gadget/data/applyscrolllines'

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

export function parsemarkdownforscroll(
  player: string,
  content: string,
  scrollname: string,
  chip = 'refscroll',
) {
  const lines: string[] = []
  parsemarkdownwithzetextsink(createscrollsink(lines), content)
  gadgetapplyscrolllines(player, scrollname, lines.join('\n'), chip)
}
