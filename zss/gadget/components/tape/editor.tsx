import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { useWriteText } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import { EditorFrame } from './editorframe'
import {
  findcursorinrows,
  sharedtosynced,
  splitcoderows,
  useTapeEditor,
} from './elements/common'
import { Textinput } from './textinput'
import { Textrows } from './elements/textrows'

export function TapeConsoleEditor() {
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
      <Textrows {...measure} />
      <Textinput {...measure} />
    </>
  )
}
