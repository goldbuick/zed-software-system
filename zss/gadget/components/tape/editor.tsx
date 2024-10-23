import { useEffect } from 'react'
import { vm_codeaddress, vm_coderelease, vm_codewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { useTape } from 'zss/device/tape'
import { textformatreadedges, useWriteText } from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import {
  findcursorinrows,
  sharedtosynced,
  splitcoderows,
  tapeeditorstate,
  useTapeEditor,
} from './common'
import { BackPlate } from './elements/backplate'
import { EditorFrame } from './elements/editorframe'
import { EditorInput } from './elements/editorinput'
import { EditorRows } from './elements/editorrows'
import { clamp } from 'zss/mapping/number'

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
  }, [tape.editor.book, tape.editor.page, tape.editor.player])

  // split by line
  const value = sharedtosynced(codepage)
  const strvalue = ispresent(value) ? value.toJSON() : ''
  const rows = splitcoderows(strvalue)
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)

  // measure edges once
  const props = {
    yoffset: tapeeditor.scroll,
    codepage,
    ycursor,
    rows,
  }

  const maxscroll = rows.length - 4
  useEffect(() => {
    const delta = ycursor - tapeeditor.scroll
    if (delta > edge.height - 8) {
      tapeeditorstate.scroll++
    }
    if (delta < 4) {
      tapeeditorstate.scroll--
    }
    tapeeditorstate.scroll = Math.round(
      clamp(tapeeditorstate.scroll, 0, maxscroll),
    )
  }, [ycursor, tapeeditor.scroll, maxscroll, edge.height])

  return (
    <>
      <BackPlate context={context} />
      <EditorFrame />
      <EditorRows {...props} />
      <EditorInput {...props} />
    </>
  )
}
