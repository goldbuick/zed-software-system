import { useWriteText } from 'zss/gadget/hooks'
import {
  HyperLinkText,
  textformatreadedges,
  tokenize,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { useTape } from '../gadget/data/state'
import {
  BG_ACTIVE,
  TapeTerminalItemInputProps,
  TapeTerminalItemProps as TapeTerminalItemProps,
  bgcolor,
  setuplogitem,
} from '../tape/common'

import { TapeTerminalCopyIt } from './copyit'
import { TapeTerminalHyperlink } from './hyperlink'
import { TapeTerminalOpenIt } from './openit'

export function TapeTerminalItem({
  blink,
  active,
  text,
  y,
}: TapeTerminalItemProps) {
  const context = useWriteText()
  const { quickterminal } = useTape()
  const edge = textformatreadedges(context)
  const ishyperlink = text.startsWith('!')

  // write text or clear line for ui
  setuplogitem(!!blink, !!active, 0, y, context)
  context.reset.bg = active ? BG_ACTIVE : bgcolor(quickterminal)
  context.active.bottomedge = edge.bottom
  tokenizeandwritetextformat(ishyperlink ? '' : text, context, true)

  // hyperlinks
  if (ishyperlink) {
    // parse hyperlink
    const [prefix, ...content] = text.slice(1).split('!')
    const hyperlink = `${content.join('!')}`

    let label = 'PRESS ME'
    const words: string[] = []

    const result = tokenize(hyperlink, true)
    for (let i = 0; i < result.tokens.length; i++) {
      const token = result.tokens[i]
      switch (token.tokenType) {
        case HyperLinkText:
          label = token.image.slice(1)
          break
        default:
          words.push(token.image)
          break
      }
    }

    // setup input props
    const [input, ...args] = words
    const props: TapeTerminalItemInputProps = {
      blink,
      active,
      prefix,
      label,
      words: args,
      y,
    }

    // render hyperlink
    switch (NAME(input)) {
      case 'copyit':
        return <TapeTerminalCopyIt {...props} words={words} />
      case 'openit':
        return <TapeTerminalOpenIt {...props} words={words} />
      default:
      case 'hyperlink':
        return <TapeTerminalHyperlink {...props} words={words} />
      case 'hk':
      case 'hotkey':
        return null
      case 'rn':
      case 'range':
        return null
      case 'sl':
      case 'select':
        return null
      case 'nm':
      case 'number':
        return null
      case 'tx':
      case 'text':
        return null
      case 'zssedit':
        return null
      case 'charedit':
        return null
      case 'coloredit':
        return null
    }
  }

  return null
}
