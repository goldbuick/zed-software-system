import {
  HyperLinkText,
  tokenize,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import {
  BKG_PTRN,
  TerminalItemInputProps,
  TerminalItemProps,
  setuplogitem,
} from '../common'

import { TerminalHyperlink } from './terminalhyperlink'

export function TerminalItem({ blink, active, text, y }: TerminalItemProps) {
  const context = useWriteText()
  const ishyperlink = text.startsWith('!')

  // write text or clear line for ui
  setuplogitem(!!blink, !!active, y, context)
  context.writefullwidth = BKG_PTRN
  context.active.bottomedge = context.height - 3
  tokenizeandwritetextformat(ishyperlink ? '' : text, context, true)
  context.writefullwidth = undefined

  // hyperlinks
  if (ishyperlink) {
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
      y,
    }

    // render hyperlink
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

  return null
}
