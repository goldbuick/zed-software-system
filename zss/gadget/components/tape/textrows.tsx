import { useSnapshot } from 'valtio'
import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import {
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../useblink'

import { setupeditoritem, tapeeditorstate } from './common'

export function Textrows() {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useSnapshot(tapeeditorstate)
  const codepage = useWaitForString(tape.editor.page)

  setupeditoritem(false, false, 1, 2, context)
  if (!ispresent(codepage)) {
    tokenizeandwritetextformat(` LOADING ${blink ? '|' : '-'}`, context, true)
    return null
  }

  // split by newlines ...
  // we need the shared string
  tokenizeandwritetextformat(`!!!!!!!!!!!!!!!`, context, true)

  return null
}
