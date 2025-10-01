import { useEffect, useLayoutEffect, useState } from 'react'
import { vm_cli } from 'zss/device/api'
import { readconfig, registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useTape, useTapeTerminal } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/hooks'
import { doasync } from 'zss/mapping/func'
import { clamp } from 'zss/mapping/number'
import { totarget } from 'zss/mapping/string'
import { BackPlate } from 'zss/screens/tape/backplate'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { TapeTerminalContext } from '../tape/common'

import { TapeTerminalInput } from './input'
import { TerminalRows } from './terminalrows'

function measurerow(item: string, width: number, height: number) {
  if (item.startsWith('!')) {
    return 1
  }
  const measure = tokenizeandmeasuretextformat(item, width, height)
  return measure?.y ?? 1
}

export function TapeTerminal() {
  const player = registerreadplayer()
  const { quickterminal } = useTape()
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))
  const terminallogs = useTape(useShallow((state) => state.terminal.logs))

  const [voice2text, setvoice2text] = useState(false)
  useLayoutEffect(() => {
    doasync(SOFTWARE, registerreadplayer(), async () => {
      const voice2text = await readconfig('voice2text')
      if (voice2text === 'on') {
        setvoice2text(true)
      }
    })
  }, [])

  const context = useWriteText()
  const tapeterminal = useTapeTerminal()

  // terminal edges
  const edge = textformatreadedges(context)

  // measure rows
  const logssize = context.width - 1
  const logsrowheights: number[] = terminallogs.map((item) => {
    return measurerow(item, logssize, edge.height)
  })

  // baseline
  const baseline = edge.bottom - edge.top - (editoropen ? 0 : 2)

  // ycoords for rows
  let logsrowtotalheight = 0
  logsrowheights.forEach((rowheight) => {
    logsrowtotalheight += rowheight
  })
  ++logsrowtotalheight

  // calculate ycoord to render cursor
  const tapeycursor = edge.bottom - tapeterminal.ycursor + tapeterminal.scroll

  // iterative scroll
  useEffect(() => {
    setTimeout(() => {
      useTapeTerminal.setState((state) => {
        const ycursor = edge.bottom - tapeterminal.ycursor + tapeterminal.scroll
        let scroll = state.scroll
        if (ycursor < 5) {
          scroll++
        }
        if (ycursor > edge.bottom - 10) {
          scroll--
        }
        scroll = Math.round(clamp(scroll, 0, logsrowtotalheight - baseline))
        return { scroll }
      })
    }, 16)
  }, [
    baseline,
    edge.bottom,
    logsrowtotalheight,
    tapeterminal.scroll,
    tapeterminal.ycursor,
  ])

  return (
    <>
      <BackPlate />
      <TapeTerminalContext.Provider
        value={{
          sendmessage(maybetarget, data) {
            const [target, message] = totarget(maybetarget)
            if (target === 'self') {
              const input = `#${message} ${data.join(' ')}`
              vm_cli(SOFTWARE, player, input)
            } else {
              SOFTWARE.emit(player, `${target}:${message}`, data)
            }
          },
        }}
      >
        <TerminalRows />
        {!editoropen && (
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
