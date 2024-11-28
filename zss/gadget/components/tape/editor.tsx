import { useEffect } from 'react'
import { vm_codeaddress, vm_coderelease, vm_codewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { useWriteText } from 'zss/gadget/components/hooks'
import { useTape, useTapeEditor } from 'zss/gadget/data/state'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { textformatreadedges } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { findcursorinrows, sharedtosynced, splitcoderows } from './common'
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
    let scroll = tapeeditor.scroll
    if (delta > edge.height - 8) {
      scroll++
    }
    if (delta < 4) {
      scroll--
    }
    useTapeEditor.setState({ scroll: Math.round(clamp(scroll, 0, maxscroll)) })
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
