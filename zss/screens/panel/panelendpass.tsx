import { useWriteText } from 'zss/gadget/writetext'
import { textformatreadedges } from 'zss/words/textformat'

import { runpanelpostpass } from './guttersync'

type PanelEndPassProps = {
  defaultcolor: number
  defaultbg: number
  hastext: boolean
}

export function PanelEndPass({
  defaultcolor,
  defaultbg,
  hastext,
}: PanelEndPassProps) {
  const context = useWriteText()
  const { left, top, bottom } = textformatreadedges(context)
  runpanelpostpass(context, {
    defaultcolor,
    defaultbg,
    hastext,
    left,
    top,
    bottom,
  })
  return null
}
