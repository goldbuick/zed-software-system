import { useLayoutEffect, useRef } from 'react'
import { wanixservertermfit } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { iswanixready, onwanixready } from 'zss/device/wanixclient/wanixbridge'
import { useWanixClient } from 'zss/device/wanixclient/wanixclientstore'
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
  const attachedsessionkey = useWanixClient((state) => state.attachedsessionkey)
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const lastpush = useRef<{ cols: number; rows: number } | null>(null)
  const { cols, rows } = readwanixtermgridsize(edge)

  useLayoutEffect(() => {
    lastpush.current = null
  }, [attachedsessionkey])

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
  }, [cols, rows, terminalopen, editoropen, attachedsessionkey])

  return null
}
