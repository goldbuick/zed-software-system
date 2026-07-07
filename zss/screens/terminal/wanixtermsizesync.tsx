import { useLayoutEffect, useRef } from 'react'
import {
  callwanixtermfit,
  waitwanixready,
} from 'zss/feature/wanix/wanixbridge'
import { readwanixtermgridsize } from 'zss/feature/wanix/wanixtermgrid'
import { useTape } from 'zss/gadget/data/zustandstores'
import { useWriteText } from 'zss/gadget/writetext'
import { textformatreadedges } from 'zss/words/textformat'

const TERM_FIT_DEBOUNCE_MS = 100

export function WanixTermSizeSync() {
  const terminalopen = useTape((state) => state.terminal.open)
  const editoropen = useTape((state) => state.editor.open)
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const lastpush = useRef<{ cols: number; rows: number } | null>(null)

  useLayoutEffect(() => {
    if (!terminalopen || editoropen) {
      return
    }
    const { cols, rows } = readwanixtermgridsize(edge)
    const timer = setTimeout(() => {
      if (
        lastpush.current?.cols === cols &&
        lastpush.current?.rows === rows
      ) {
        return
      }
      void waitwanixready()
        .then(() => callwanixtermfit(cols, rows))
        .then(() => {
          lastpush.current = { cols, rows }
        })
        .catch((err) => {
          if (import.meta.env.DEV) {
            console.warn(
              '[wanix termfit]',
              err instanceof Error ? err.message : String(err),
            )
          }
        })
    }, TERM_FIT_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [edge.width, edge.height, terminalopen, editoropen])

  return null
}
