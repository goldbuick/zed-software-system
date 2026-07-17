import { useContext } from 'react'
import { parsezedlinkline } from 'zss/feature/zedlinkparse'
import { useTape } from 'zss/gadget/data/zustandstores'
import { useWriteText } from 'zss/gadget/writetext'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { LinkRouter } from 'zss/screens/linkui/router'
import type { LinkSurface } from 'zss/screens/linkui/types'
import { BG_ACTIVE, bgcolorformode } from 'zss/screens/tape/colors'
import {
  TapeTerminalContext,
  TapeTerminalItemProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import {
  hascenter,
  textformatreadedges,
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
} from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

export function TerminalItem({ active, text, y }: TapeTerminalItemProps) {
  const context = useWriteText()
  const cc = useContext(TapeTerminalContext)
  const terminalmode = useTape((state) => state.terminalmode)
  const edge = textformatreadedges(context)
  const ishyperlink = text.startsWith('!')

  setuplogitem(!!active, 0, y, context)
  context.reset.bg = active ? BG_ACTIVE : bgcolorformode(terminalmode)
  context.active.bottomedge = edge.bottom

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

  if (!ishyperlink) {
    return null
  }

  const parsed = parsezedlinkline(text)
  if (!parsed) {
    return null
  }

  const [input] = parsed.words
  const linktype = NAME(input)
  const known =
    linktype === 'copyit' ||
    linktype === 'openit' ||
    linktype === 'viewit' ||
    linktype === 'runit' ||
    linktype === 'hk' ||
    linktype === 'hotkey' ||
    linktype === 'rn' ||
    linktype === 'range' ||
    linktype === 'sl' ||
    linktype === 'select' ||
    linktype === 'nm' ||
    linktype === 'number' ||
    linktype === 'tx' ||
    linktype === 'text' ||
    linktype === 'zssedit' ||
    linktype === 'charedit' ||
    linktype === 'coloredit' ||
    linktype === 'bgedit' ||
    linktype === 'hyperlink'

  const surface: LinkSurface = {
    layout: 'terminal',
    active: !!active,
    label: parsed.label,
    words: parsed.words,
    chip: parsed.chip,
    modemprefix: parsed.modemprefix,
    row: y,
    striperow: y,
    sidebar: false,
    context,
    sendmessage: cc.sendmessage,
    sendclose: () => {},
  }

  return (
    <LinkRouter
      linktype={known ? linktype : 'hyperlink'}
      surface={surface}
    />
  )
}

export function TapeTerminalActiveItem({
  active,
  text,
  y,
}: TapeTerminalItemProps) {
  return <TerminalItem active={active} text={text} y={y} />
}
