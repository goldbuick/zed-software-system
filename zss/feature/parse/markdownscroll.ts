import {
  MarkdownZedSink,
  parsemarkdownwithzetextsink,
} from 'zss/feature/parse/markdownzetext'
import {
  scrolllinkescapefrag,
  scrollwritelines,
} from 'zss/gadget/data/scrollwritelines'

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
  scrollwritelines(player, scrollname, lines.join('\n'), chip)
}

/**
 * Scroll body is already Zed tape lines: plain zetext and `!command;label` hyperlinks
 * (same rules as scrollwritelines). Use for built-in VM scroll strings;
 * use parsemarkdownforscroll for CommonMark (refscroll help prose, wiki fetch, etc.).
 */
export function applyzedscroll(
  player: string,
  content: string,
  scrollname: string,
  chip = 'refscroll',
): void {
  scrollwritelines(player, scrollname, content.trim(), chip)
}
