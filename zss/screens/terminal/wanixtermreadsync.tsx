import { useEffect, useRef } from 'react'
import {
  readwanixtermbuffer,
  readwanixtermbufferkeys,
  readwanixtermnotifyversion,
  subscribewanixtermbuffer,
} from 'zss/feature/wanix/wanixbridge'
import { readwanixtermgridpreview } from 'zss/feature/wanix/wanixtermgridstate'
import { useTape } from 'zss/gadget/data/zustandstores'

export function WanixTermReadSync() {
  const terminalopen = useTape((state) => state.terminal.open)
  const editoropen = useTape((state) => state.editor.open)
  const lastlogged = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!terminalopen || editoropen) {
      return
    }

    const flush = () => {
      const notifyversion = readwanixtermnotifyversion()
      for (const sessionkey of readwanixtermbufferkeys()) {
        const buffer = readwanixtermbuffer(sessionkey)
        if (!buffer) {
          continue
        }
        const prev = lastlogged.current.get(sessionkey)
        if (prev === buffer.version) {
          continue
        }
        lastlogged.current.set(sessionkey, buffer.version)
        console.info('[wanix term read]', {
          sessionkey,
          cols: buffer.cols,
          rows: buffer.rows,
          digest: buffer.digest,
          cursor: {
            x: buffer.cursorx,
            y: buffer.cursory,
            visible: buffer.cursorvisible,
          },
          preview: readwanixtermgridpreview(buffer),
          notifyversion,
        })
      }
    }

    const unsubscribe = subscribewanixtermbuffer(flush)
    flush()
    return unsubscribe
  }, [terminalopen, editoropen])

  useEffect(() => {
    if (!terminalopen || editoropen) {
      lastlogged.current.clear()
    }
  }, [terminalopen, editoropen])

  return null
}
