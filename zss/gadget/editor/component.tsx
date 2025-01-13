import { useEffect } from 'react'
import { createdevice } from 'zss/device'
import { vm_codeaddress, vm_coderelease, vm_codewatch } from 'zss/device/api'
import { useWaitForValueString } from 'zss/device/modem'
import { useTape, useTapeEditor } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/hooks'
import { clamp } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import { textformatreadedges } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { BackPlate } from '../tape/backplate'
import {
  findcursorinrows,
  findmaxwidthinrows,
  sharedtosynced,
  splitcoderows,
} from '../tape/common'

import { EditorFrame } from './editorframe'
import { EditorInput } from './editorinput'
import { EditorRows } from './editorrows'

const gadgeteditor = createdevice('gadgeteditor')

export function TapeEditor() {
  const [editor] = useTape(useShallow((state) => [state.editor]))

  const context = useWriteText()
  const tapeeditor = useTapeEditor()
  const codepage = useWaitForValueString(
    vm_codeaddress(editor.book, editor.page),
  )
  const edge = textformatreadedges(context)

  useEffect(() => {
    vm_codewatch(gadgeteditor, editor.book, editor.page, editor.player)
    return () => {
      vm_coderelease(gadgeteditor, editor.book, editor.page, editor.player)
    }
  }, [editor.book, editor.page, editor.player])

  // split by line
  const value = sharedtosynced(codepage)
  const strvalue = ispresent(value) ? value.toJSON() : ''
  const rows = splitcoderows(strvalue)
  const ycursor = findcursorinrows(tapeeditor.cursor, rows)
  const xcursor = tapeeditor.cursor - rows[ycursor].start
  // figure out longest line of code
  const maxwidth = findmaxwidthinrows(rows)

  // measure edges once
  const props = {
    rows,
    xcursor,
    ycursor,
    codepage,
    xoffset: tapeeditor.xscroll,
    yoffset: tapeeditor.yscroll,
  }

  const chunkstep = 32
  const xmaxscroll = (Math.round(maxwidth / chunkstep) + 1) * chunkstep
  const ymaxscroll = rows.length

  useEffect(() => {
    let xscroll = tapeeditor.xscroll
    const xdelta = xcursor - xscroll
    const xwidth = edge.width - 3

    let xstep = Math.round(clamp(Math.abs(xdelta) * 0.5, 1, chunkstep))
    if (xstep < 8) {
      xstep = 1
    }
    if (xdelta > xwidth - 8) {
      xscroll += xstep
    }
    if (xdelta < 8) {
      xscroll -= xstep
    }

    let yscroll = tapeeditor.yscroll
    const ydelta = ycursor - yscroll
    const yheight = edge.height - 4
    const ymaxstep = Math.round(yheight * 0.5)

    let ystep = Math.round(clamp(Math.abs(ydelta) * 0.25, 1, ymaxstep))
    if (ystep < 8) {
      ystep = 1
    }
    if (ydelta > yheight - 4) {
      yscroll += ystep
    }
    if (ydelta < 4) {
      yscroll -= ystep
    }

    // update
    setTimeout(
      () =>
        useTapeEditor.setState({
          xscroll: Math.round(clamp(xscroll, 0, xmaxscroll)),
          yscroll: Math.round(clamp(yscroll, 0, ymaxscroll)),
        }),
      16,
    )
  }, [
    xcursor,
    xmaxscroll,
    tapeeditor.xscroll,
    ycursor,
    ymaxscroll,
    tapeeditor.yscroll,
    edge.width,
    edge.height,
  ])

  return (
    <>
      <BackPlate context={context} />
      <EditorFrame />
      <EditorRows {...props} />
      <EditorInput {...props} />
    </>
  )
}
