import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { useWriteText } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import {
  findcursorinrows,
  sharedtosynced,
  splitcoderows,
  useTapeEditor,
} from './common'
import { EditorFrame } from './elements/editorframe'
import { EditorInput } from './elements/editorinput'
import { EditorRows } from './elements/editorrows'

export function TapeEditor() {
  const tape = useTape()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForString(
    tape.editor.book,
    tape.editor.page,
    tape.editor.player,
  )

  // split by line
  const value = sharedtosynced(codepage)
  const strvalue = ispresent(value) ? value.toJSON() : ''
  const rows = splitcoderows(strvalue)
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const halfviewheight = Math.round((context.height - 3) * 0.5)
  const yoffset = clamp(
    ycursor - halfviewheight,
    0,
    rows.length - halfviewheight,
  )

  // measure edges once
  const measure = {
    ycursor,
    yoffset,
    rows,
  }

  return (
    <>
      <EditorFrame />
      <EditorRows {...measure} />
      <EditorInput {...measure} />
    </>
  )
}
