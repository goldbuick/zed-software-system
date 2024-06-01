import {
  HyperLinkText,
  tokenize,
  tokenizeandwritetextformat,
} from 'zss/gadget/data/textformat'

import {
  ConsoleItemInputProps,
  ConsoleItemProps,
  setupitemcontext,
} from './common'
import { TapeConsoleHyperlink } from './hyperlink'

export function TapeConsoleItem({
  blink,
  active,
  text,
  offset,
  context,
}: ConsoleItemProps) {
  if (text.startsWith('!')) {
    // parse hyperlink
    const [prefix, ...content] = text.slice(1).split('!')
    const hyperlink = `${content.join('!')}`

    let label = 'PRESS ME'
    const words: string[] = []

    const result = tokenize(hyperlink)
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
    const props: ConsoleItemInputProps = {
      blink,
      active,
      prefix,
      label,
      words: args,
      offset,
      context,
    }

    switch (input.toLowerCase()) {
      case 'hk':
      case 'hotkey':
        return <TapeConsoleHyperlink {...props} />
      case 'hyperlink':
      case 'rn':
      case 'range':
        return <TapeConsoleHyperlink {...props} />
      case 'sl':
      case 'select':
        return <TapeConsoleHyperlink {...props} />
      case 'nm':
      case 'number':
        return <TapeConsoleHyperlink {...props} />
      case 'tx':
      case 'text':
        return <TapeConsoleHyperlink {...props} />
      default:
        return <TapeConsoleHyperlink {...props} words={words} />
    }
  }

  // render output
  setupitemcontext(!!blink, !!active, offset, context)
  tokenizeandwritetextformat(text, context, true)

  return null
}
