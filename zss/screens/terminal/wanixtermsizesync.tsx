import { useLayoutEffect, useRef, useState } from 'react'
import { subscribewanixattach } from 'zss/feature/wanix/wanixattachstate'
import { callwanixtermfit, waitwanixready } from 'zss/feature/wanix/wanixbridge'
import { useTape } from 'zss/gadget/data/zustandstores'
import { useWriteText } from 'zss/gadget/writetext'
import { textformatreadedges } from 'zss/words/textformat'

const TERM_FIT_DEBOUNCE_MS = 100

function readwanixtermgridsize(edge: { width: number; height: number }) {
  return {
    cols: Math.max(1, edge.width),
    rows: Math.max(1, edge.height),
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
      void waitwanixready()
        .then(() => callwanixtermfit(cols, rows))
        .then(() => {
          lastpush.current = { cols, rows }
        })
        .catch(() => {})
    }, TERM_FIT_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [cols, rows, terminalopen, editoropen, attachversion])

  return null
}
