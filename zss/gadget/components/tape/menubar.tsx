import { useTape } from 'zss/device/tape'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import { useBlink } from '../useblink'

import { EG_BOTTOM, EG_TOP, setupeditoritem } from './common'

export function Menubar() {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()

  setupeditoritem(false, false, 0, 0, context)
  const egtop = `${EG_TOP}`.repeat(context.width - 4)
  const egbottom = `${EG_BOTTOM}`.repeat(context.width - 4)
  tokenizeandwritetextformat(`$213$205$187${egtop}$191`, context, true)
  tokenizeandwritetextformat(
    `$179$${blink ? '7' : '232'}$200${egbottom}$181`,
    context,
    true,
  )

  // make label
  const label = tape.editor.type === 'object' ? '' : `[${tape.editor.type}]`

  // write name
  const title = ` ${tape.editor.title}${label} `
  const result = tokenizeandmeasuretextformat(
    title,
    context.width,
    context.height,
  )
  const titlewidth = result?.measuredwidth ?? 1
  const titlex = Math.round(context.width * 0.5) - Math.round(titlewidth * 0.5)
  setupeditoritem(false, false, titlex, 0, context)
  tokenizeandwritetextformat(title, context, true)

  return null
}
