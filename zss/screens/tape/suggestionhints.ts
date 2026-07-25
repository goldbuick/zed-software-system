import type { COMMAND_ARGS_SIGNATURE } from 'zss/firmware'
import type { GADGET_ZSS_WORDS } from 'zss/gadget/data/types'
import { isarray, ispresent } from 'zss/mapping/types'
import { romread } from 'zss/rom'
import { romhintfrommarkdown } from 'zss/rom/romhint'
import { ARG_TYPE } from 'zss/words/types'

import type { AUTO_COMPLETE_SUGGESTION } from './argcomplete'

export function hintfromrom(category: string, word = ''): string {
  const rompath = word ? `editor:${category}:${word}` : `editor:${category}`
  const rom = romread(rompath)
  if (ispresent(rom)) {
    return romhintfrommarkdown(rom) ?? ''
  }
  switch (category) {
    case 'flags':
      return `flag ${word}`
    default:
      return ''
  }
}

export function argsliststring(args: ARG_TYPE[]): string {
  const list = []
  for (const arg of args) {
    switch (arg) {
      case ARG_TYPE.COLOR:
        list.push('<color>')
        break
      case ARG_TYPE.KIND:
        list.push('<kind>')
        break
      case ARG_TYPE.DIR:
        list.push('<dir>')
        break
      case ARG_TYPE.NAME:
        list.push('<name>')
        break
      case ARG_TYPE.NUMBER:
        list.push('<number>')
        break
      case ARG_TYPE.STRING:
        list.push('<string>')
        break
      case ARG_TYPE.NUMBER_OR_STRING:
        list.push('<num|str>')
        break
      case ARG_TYPE.COLOR_OR_KIND:
        list.push('<color|kind>')
        break
      case ARG_TYPE.MAYBE_KIND:
        list.push('[kind]')
        break
      case ARG_TYPE.MAYBE_NAME:
        list.push('[name]')
        break
      case ARG_TYPE.MAYBE_NUMBER:
        list.push('[number]')
        break
      case ARG_TYPE.MAYBE_STRING:
        list.push('[string]')
        break
      case ARG_TYPE.MAYBE_NUMBER_OR_STRING:
        list.push('[num|str]')
        break
      case ARG_TYPE.ANY:
        list.push('<any>')
        break
    }
  }
  return list.join(' ')
}

/** Detail text for a highlighted autocomplete suggestion (ROM / firmware signature). */
export function resolvesuggestionhint(
  suggestion: AUTO_COMPLETE_SUGGESTION,
  words: GADGET_ZSS_WORDS,
): string {
  switch (suggestion.category) {
    case 'objects':
      return 'object codepage'
    case 'terrains':
      return 'terrain codepage'
    case 'boards':
      return 'board codepage'
    case 'palettes':
      return 'palette codepage'
    case 'charsets':
      return 'charset codepage'
    case 'loaders':
      return 'loader codepage'
    case 'commands': {
      const wk = suggestion.word.toLowerCase()
      const sig: COMMAND_ARGS_SIGNATURE | undefined =
        words.langcommands[wk] ??
        words.clicommands[wk] ??
        words.loadercommands[wk] ??
        words.runtimecommands[wk]
      if (isarray(sig)) {
        const args = [...sig] as ARG_TYPE[]
        const cmd = args.pop()
        return `${argsliststring(args)} ${cmd}`
      }
      return ''
    }
    default:
      return hintfromrom(suggestion.category, suggestion.word)
  }
}
