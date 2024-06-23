import { useWaitForString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { useWriteText } from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import {
  findcursorinrows,
  sharedtosynced,
  splitcoderows,
  useTapeEditor,
} from './common'
import { EditorFrame } from './editorframe'
import { Textinput } from './textinput'
import { Textrows } from './textrows'

export function TapeConsoleEditor() {
  const tape = useTape()
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

  // measure edges once
  const measure = {
    ycursor,
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
