import { useLayoutEffect, useRef, useState } from 'react'
import { wanixservertermfit } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { iswanixready, onwanixready } from 'zss/device/wanixclient/wanixbridge'
import { subscribewanixattach } from 'zss/device/wanixclient/wanixdisplay'
import { useTape } from 'zss/gadget/data/zustandstores'
import { useWriteText } from 'zss/gadget/writetext'
import { textformatreadedges } from 'zss/words/textformat'

const TERM_FIT_DEBOUNCE_MS = 100

function readwanixtermgridsize(edge: { width: number; height: number }) {
  return {
    cols: Math.max(1, edge.width),
    // Bottom row is the hint bar in WanixTermScreen — guest rows must match visible height.
    rows: Math.max(1, edge.height - 1),
  }
}

export function WanixTermSizeSync() {
  const terminalopen = useTape((state) => state.terminal.open)
  const editoropen = useTape((state) => state.editor.open)
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const lastpush = useRef<{ cols: number; rows: number } | null>(null)
  const [attachversion, setattachversion] = useState(0)
  const { cols, rows } = readwanixtermgridsize(edge)

  useLayoutEffect(
    () =>
      subscribewanixattach(() => {
        lastpush.current = null
        setattachversion((prev) => prev + 1)
      }),
    [],
  )

  useLayoutEffect(() => {
    if (!terminalopen || editoropen) {
      return
    }
    const timer = setTimeout(() => {
      if (lastpush.current?.cols === cols && lastpush.current?.rows === rows) {
        return
      }
      const pushfit = () => {
        wanixservertermfit(SOFTWARE, registerreadplayer(), cols, rows)
        lastpush.current = { cols, rows }
      }
      if (iswanixready()) {
        pushfit()
      } else {
        onwanixready(pushfit)
      }
    }, TERM_FIT_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [cols, rows, terminalopen, editoropen, attachversion])

  return null
}
