import { SOFTWARE } from 'zss/device/session'
import {
  MarkdownZedSink,
  parsemarkdownwithzetextsink,
} from 'zss/feature/parse/markdownzetext'
import { write, writehyperlink } from 'zss/feature/writeui'

function createwriteuisink(player: string): MarkdownZedSink {
  return {
    line: (s: string) => write(SOFTWARE, player, s),
    hyperlink: (command: string, label: string) => {
      writehyperlink(SOFTWARE, player, command, label)
    },
  }
}

export function parsemarkdownforwriteui(player: string, content: string) {
  parsemarkdownwithzetextsink(createwriteuisink(player), content)
}
