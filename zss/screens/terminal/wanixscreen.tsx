import { useEffect, useState } from 'react'
import { wanixhostapplytermsize } from 'zss/feature/wanix/wanixhost'
import {
  readwanixtermscreencells,
  subscribewanixtermscreen,
  wanixtermscreenresize,
} from 'zss/feature/wanix/wanixtermscreen'
import { writetile } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import { textformatreadedges } from 'zss/words/textformat'

export function WanixTermScreen() {
  const context = useWriteText()
  const edge = textformatreadedges(context)
  const [, settick] = useState(0)

  useEffect(() => {
    return subscribewanixtermscreen(() => {
      settick((v) => v + 1)
    })
  }, [])

  useEffect(() => {
    wanixtermscreenresize(edge.width, edge.height)
    wanixhostapplytermsize(edge.width, edge.height)
  }, [edge.width, edge.height])

  const cells = readwanixtermscreencells()

  for (let y = edge.top; y <= edge.bottom; ++y) {
    const row = y - edge.top
    if (row < 0 || row >= cells.height) {
      continue
    }
    for (let x = edge.left; x <= edge.right; ++x) {
      const col = x - edge.left
      if (col < 0 || col >= cells.width) {
        continue
      }
      const index = col + row * cells.width
      const ch = cells.char[index] ?? 32
      let color = cells.color[index]
      let bg = cells.bg[index]
      if (
        cells.cursorvisible &&
        col === cells.cursorx &&
        row === cells.cursory
      ) {
        const fg = color
        const cellbg = bg
        color = cellbg
        bg = fg
      }
      writetile(context, edge.width, edge.height, x, y, {
        char: ch,
        color,
        bg,
      })
    }
  }

  context.changed()

  return null
}
