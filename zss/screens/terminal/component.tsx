import { useLayoutEffect, useState } from 'react'
import { vmcli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfig } from 'zss/feature/storage'
import { useTape, useTerminal } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/hooks'
import { doasync } from 'zss/mapping/func'
import { totarget } from 'zss/mapping/string'
import { MAYBE } from 'zss/mapping/types'
import { BackPlate } from 'zss/screens/tape/backplate'
import { TapeTerminalContext } from 'zss/screens/tape/common'
import { measurerow } from 'zss/screens/tape/measure'
import { textformatreadedges } from 'zss/words/textformat'

import { TapeTerminalInput } from './input'
import { TerminalRows } from './rows'

export function TapeTerminal() {
  const player = registerreadplayer()
  const editoropen = useTape((state) => state.editor.open)
  const terminallogs = useTape((state) => state.terminal.logs)
  const quickterminal = useTape((state) => state.quickterminal)

  const [voice2text, setvoice2text] = useState<MAYBE<boolean>>(undefined)
  useLayoutEffect(() => {
    doasync(SOFTWARE, registerreadplayer(), async () => {
      const voice2text = await storagereadconfig('voice2text')
      setvoice2text(voice2text === 'on')
    })
  }, [])

  const context = useWriteText()
  const tapeterminal = useTerminal()

  // terminal edges
  const edge = textformatreadedges(context)

  // measure rows
  const logsrowmaxwidth = context.width - 1
  const logsrowheights: number[] = terminallogs.map((item) => {
    return measurerow(item, logsrowmaxwidth, edge.height)
  })

  // ycoords for rows
  let logsrowtotalheight = 0
  logsrowheights.forEach((rowheight) => {
    logsrowtotalheight += rowheight
  })
  ++logsrowtotalheight

  // calculate ycoord to render cursor
  const tapeycursor = edge.bottom - tapeterminal.ycursor + tapeterminal.scroll

  return (
    <>
      <BackPlate />
      <TapeTerminalContext.Provider
        value={{
          sendmessage(maybetarget, data) {
            const [target, message] = totarget(maybetarget)
            if (target === 'self') {
              const input = `#${message} ${data.join(' ')}`
              vmcli(SOFTWARE, player, input)
            } else {
              SOFTWARE.emit(player, `${target}:${message}`, data)
            }
          },
        }}
      >
        <TerminalRows />
        {!editoropen && voice2text !== undefined && (
          <TapeTerminalInput
            quickterminal={quickterminal}
            voice2text={voice2text}
            tapeycursor={tapeycursor}
            logrowtotalheight={logsrowtotalheight}
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
