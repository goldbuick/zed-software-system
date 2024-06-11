import { SyncedText } from '@syncedstore/core'
import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import {
  tokenizeandwritetextformat,
  useWriteText,
  writeplaintext,
} from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import { useBlink } from '../useblink'

import {
  BG,
  BG_ACTIVE,
  findcursorinrows,
  setupeditoritem,
  sharedtorows,
  splitcoderows,
  useTapeEditor,
} from './common'

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
  const rows = sharedtorows(codepage)
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const fillwidth = context.width - 2
  const bottomedge = context.height - 3

  setupeditoritem(false, false, 1, 2, 1, context)
  for (let i = 0; i < rows.length && context.y <= bottomedge; ++i) {
    const row = rows[i]
    const active = i === ycursor
    const text = row.code.replaceAll('\n', '')
    const fill = ' '.repeat(fillwidth)
    context.isEven = context.y % 2 === 0
    context.activeBg = active ? BG_ACTIVE : BG
    writeplaintext(`${text}${fill}`.substring(0, fillwidth), context, true)
  }

  return null
}
