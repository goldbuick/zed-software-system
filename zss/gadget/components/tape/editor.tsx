import { useEffect } from 'react'
import { vm_codeaddress, vm_coderelease, vm_codewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { textformatreadedges, useWriteText } from 'zss/gadget/data/textformat'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { useShallow } from 'zustand/react/shallow'

import {
  findcursorinrows,
  sharedtosynced,
  splitcoderows,
  useTape,
  useTapeEditor,
} from './common'
import { BackPlate } from './elements/backplate'
import { EditorFrame } from './elements/editorframe'
import { EditorInput } from './elements/editorinput'
import { EditorRows } from './elements/editorrows'

export function TapeEditor() {
  const [editor] = useTape(useShallow((state) => [state.editor]))

  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForValueString(
    vm_codeaddress(editor.book, editor.page),
  )
  const edge = textformatreadedges(context)

  useEffect(() => {
    vm_codewatch('editor', editor.book, editor.page, editor.player)
    return () => {
      vm_coderelease('editor', editor.book, editor.page, editor.player)
    }
  }, [editor.book, editor.page, editor.player])

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
    // if (delta > edge.height - 8) {
    //   tapeeditorstate.scroll++
    // }
    // if (delta < 4) {
    //   tapeeditorstate.scroll--
    // }
    // tapeeditorstate.scroll = Math.round(
    //   clamp(tapeeditorstate.scroll, 0, maxscroll),
    // )
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
