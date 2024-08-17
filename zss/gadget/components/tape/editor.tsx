import { useEffect } from 'react'
import { vm_codeaddress, vm_coderelease, vm_codewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { textformatreadedges, useWriteText } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'

import {
  findcursorinrows,
  sharedtosynced,
  splitcoderows,
  useTapeEditor,
} from './common'
import { BackPlate } from './elements/backplate'
import { EditorFrame } from './elements/editorframe'
import { EditorInput } from './elements/editorinput'
import { EditorRows } from './elements/editorrows'

export function TapeEditor() {
  const tape = useTape()
  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForValueString(
    vm_codeaddress(tape.editor.book, tape.editor.page),
  )
  const edge = textformatreadedges(context)

  useEffect(() => {
    vm_codewatch(
      'editor',
      tape.editor.book,
      tape.editor.page,
      tape.editor.player,
    )
    return () => {
      vm_coderelease(
        'editor',
        tape.editor.book,
        tape.editor.page,
        tape.editor.player,
      )
    }
  }, [codepage, tape.editor.book, tape.editor.page, tape.editor.player])

  // split by line
  const value = sharedtosynced(codepage)
  const strvalue = ispresent(value) ? value.toJSON() : ''
  const rows = splitcoderows(strvalue)
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const halfviewheight = Math.round((edge.height - 3) * 0.5)
  const yoffset = clamp(
    ycursor - halfviewheight,
    0,
    rows.length - halfviewheight,
  )

  // measure edges once
  const props = {
    codepage,
    ycursor,
    yoffset,
    rows,
  }

  // Need to have yoffset independent of ycursor
  // so we can have mouse wheel & touch scrolling
  // the cursor only snaps the view when being moved via arrow keys or controller

  return (
    <>
      <BackPlate context={context} />
      <EditorFrame />
      <EditorRows {...props} />
      <EditorInput {...props} />
    </>
  )
}
