import { SyncedText } from '@syncedstore/core'
import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import {
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../useblink'

import { setupeditoritem, useTapeEditor } from './common'

export function Textrows() {
  const tape = useTape()
  const blink = useBlink()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForString(tape.editor.page)

  setupeditoritem(false, false, 1, 2, 1, context)
  if (!ispresent(codepage)) {
    tokenizeandwritetextformat(` LOADING ${blink ? '|' : '-'}`, context, true)
    return null
  }

  // split by line
  const code = (codepage.value as SyncedText).toJSON()
  const rows = code.split(/\r?\n/)

  const height = context.height - 3
  setupeditoritem(false, false, 1, 2, 1, context)
  for (let i = 0; i < rows.length && i < height; ++i) {
    const row = rows[i]
    tokenizeandwritetextformat(`${row} `, context, true)
  }

  return null
}
