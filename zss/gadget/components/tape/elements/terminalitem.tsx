import {
  HyperLinkText,
  tokenize,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import {
  TerminalItemInputProps,
  TerminalItemProps,
  setuplogitem,
} from '../common'

import { TerminalHyperlink } from './terminalhyperlink'

export function TerminalItem({
  blink,
  active,
  text,
  offset,
}: TerminalItemProps) {
  const context = useWriteText()

  // setup context for item
  setuplogitem(!!blink, !!active, offset, context)

  // write ui
  if (text.startsWith('!')) {
    // parse hyperlink
    const [prefix, ...content] = text.slice(1).split('!')
    const hyperlink = `${content.join('!')}`

    let label = 'PRESS ME'
    const words: string[] = []

    const result = tokenize(hyperlink, true)
    result.tokens.forEach((token) => {
      switch (token.tokenType) {
        case HyperLinkText:
          label = token.image.slice(1)
          break
        default:
          words.push(token.image)
          break
      }
    })

    // setup input props
    const [input, ...args] = words
    const props: TerminalItemInputProps = {
      blink,
      active,
      prefix,
      label,
      words: args,
      offset,
    }

    switch (input.toLowerCase()) {
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
      default:
      case 'hyperlink':
        return <TerminalHyperlink {...props} words={words} />
    }
  }

  // render text output
  tokenizeandwritetextformat(text, context, true)
  return null
}
