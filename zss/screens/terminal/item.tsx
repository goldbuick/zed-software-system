import { useTape } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { BG_ACTIVE, bgcolor } from 'zss/screens/tape/colors'
import {
  TapeTerminalItemInputProps,
  TapeTerminalItemProps as TapeTerminalItemProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import {
  hascenter,
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { TerminalCharEdit } from './charedit'
import { TerminalColorEdit } from './coloredit'
import { TerminalCopyIt } from './copyit'
import { TerminalHotkey } from './hotkey'
import { TerminalHyperlink } from './hyperlink'
import { TerminalNumber } from './number'
import { TerminalOpenIt } from './openit'
import { parseloghyperlink } from './parseloghyperlink'
import { TerminalRange } from './range'
import { TerminalRunIt } from './runit'
import { TerminalSelect } from './select'
import { TerminalText } from './text'
import { TerminalViewIt } from './viewit'
import { TerminalZSSEdit } from './zssedit'

export function TerminalItem({ active, text, y }: TapeTerminalItemProps) {
  const context = useWriteText()
  const quickterminal = useTape((state) => state.quickterminal)
  const edge = textformatreadedges(context)
  const ishyperlink = text.startsWith('!')

  // write text or clear line for ui
  setuplogitem(!!active, 0, y, context)
  context.reset.bg = active ? BG_ACTIVE : bgcolor(quickterminal)
  context.active.bottomedge = edge.bottom

  // detect $CENTER
  const centertext = hascenter(text)
  if (ispresent(centertext)) {
    const widthmax = edge.width - 3
    const measure = tokenizeandmeasuretextformat(centertext, widthmax, 3)
    const contentmax = measure?.measuredwidth ?? 1
    const padding = clamp(
      Math.floor(widthmax * 0.5 - contentmax * 0.5),
      0,
      widthmax,
    )
    tokenizeandwritetextformat(
      `${' '.repeat(padding)}$WHITE${centertext}`,
      context,
      true,
    )
  } else {
    tokenizeandwritetextformat(ishyperlink ? '' : text, context, true)
  }

  // hyperlinks
  if (ishyperlink) {
    // parse hyperlink
    const [prefix, ...content] = text.slice(1).split('!')
    const hyperlink = `${content.join('!')}`

    const { label, words } = parseloghyperlink(hyperlink)

    // setup input props
    const [input, ...args] = words
    const props: TapeTerminalItemInputProps = {
      active,
      prefix,
      label,
      words: args,
      y,
    }

    // render hyperlink
    switch (NAME(input)) {
      case 'copyit':
        return <TerminalCopyIt {...props} words={words} />
      case 'openit':
        return <TerminalOpenIt {...props} words={words} />
      case 'viewit':
        return <TerminalViewIt {...props} words={words} />
      case 'runit':
        return <TerminalRunIt {...props} words={words} />
      default:
      case 'hyperlink':
        return <TerminalHyperlink {...props} words={words} />
      case 'hk':
      case 'hotkey':
        return <TerminalHotkey {...props} words={words} />
      case 'rn':
      case 'range':
        return <TerminalRange {...props} words={words} />
      case 'sl':
      case 'select':
        return <TerminalSelect {...props} words={words} />
      case 'nm':
      case 'number':
        return <TerminalNumber {...props} words={words} />
      case 'tx':
      case 'text':
        return <TerminalText {...props} words={words} />
      case 'zssedit':
        return <TerminalZSSEdit {...props} words={words} />
      case 'charedit':
        return <TerminalCharEdit {...props} words={words} />
      case 'coloredit':
        return <TerminalColorEdit {...props} words={words} />
      case 'bgedit':
        return <TerminalColorEdit {...props} words={words} isbg />
    }
  }

  return null
}

export function TapeTerminalActiveItem({
  active,
  text,
  y,
}: TapeTerminalItemProps) {
  return <TerminalItem active={active} text={text} y={y} />
}
