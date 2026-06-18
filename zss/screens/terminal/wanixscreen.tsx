import { useEffect, useState } from 'react'
import { writetile } from 'zss/gadget/tiles'
import { useWriteText } from 'zss/gadget/writetext'
import {
  readwanixtermscreencells,
  subscribewanixtermscreen,
  wanixtermscreenresize,
} from 'zss/feature/wanix/wanixtermscreen'
import { drawblockcursor } from 'zss/screens/inputcommon'
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
      writetile(context, edge.width, edge.height, x, y, {
        char: ch,
        color: cells.color[index],
        bg: cells.bg[index],
      })
    }
  }

  if (
    cells.cursorx >= 0 &&
    cells.cursory >= 0 &&
    cells.cursorx < cells.width &&
    cells.cursory < cells.height
  ) {
    const screeny = edge.top + cells.cursory
    if (screeny >= edge.top && screeny <= edge.bottom) {
      drawblockcursor(cells.cursorx, screeny, edge, context)
    }
  }

  return null
}
