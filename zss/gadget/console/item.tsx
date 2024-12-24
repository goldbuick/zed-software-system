import { useWriteText } from 'zss/gadget/hooks'
import {
  HyperLinkText,
  textformatreadedges,
  tokenize,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import {
  ConsoleItemInputProps,
  ConsoleItemProps,
  setuplogitem,
} from '../tape/common'

import { ConsoleCopyIt } from './copyit'
import { ConsoleHyperlink } from './hyperlink'

export function ConsoleItem({ blink, active, text, y }: ConsoleItemProps) {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const ishyperlink = text.startsWith('!')

  // write text or clear line for ui
  setuplogitem(!!blink, !!active, 0, y, context)
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
      y,
    }

    // render hyperlink
    switch (NAME(input)) {
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
      case 'copyit':
        return <ConsoleCopyIt {...props} words={words} />
      default:
      case 'hyperlink':
        return <ConsoleHyperlink {...props} words={words} />
    }
  }

  return null
}
