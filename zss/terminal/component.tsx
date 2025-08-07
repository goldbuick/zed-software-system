import { useEffect, useLayoutEffect, useState } from 'react'
import { vm_cli } from 'zss/device/api'
import { readconfig, registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useTape, useTapeTerminal } from 'zss/gadget/data/state'
import { doasync } from 'zss/mapping/func'
import { clamp } from 'zss/mapping/number'
import { totarget } from 'zss/mapping/string'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { useWriteText } from '../gadget/hooks'
import { BackPlate } from '../tape/backplate'
import { TapeTerminalContext, terminalsplit } from '../tape/common'

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
  const terminalinfo = useTape(useShallow((state) => state.terminal.info))
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

  // wide terminal
  const edge = textformatreadedges(context)
  const xstep = terminalsplit(context.width)

  // measure rows
  const infosize = xstep - 1
  const inforowheights: number[] = terminalinfo.map((item) => {
    return measurerow(item, infosize, edge.height)
  })
  const logssize = context.width - xstep - 1
  const logsrowheights: number[] = terminallogs.map((item) => {
    return measurerow(item, logssize, edge.height)
  })

  // baseline
  const baseline = edge.bottom - edge.top - (editoropen ? 0 : 2)

  // ycoords for rows
  let inforowtotalheight = 0
  inforowheights.forEach((rowheight) => {
    inforowtotalheight += rowheight
  })
  ++inforowtotalheight

  // ycoords for rows
  let logsrowtotalheight = 0
  logsrowheights.forEach((rowheight) => {
    logsrowtotalheight += rowheight
  })
  ++logsrowtotalheight

  // calculate ycoord to render cursor
  const tapeycursor = edge.bottom - tapeterminal.ycursor + tapeterminal.scroll
  const logrowtotalheight = Math.max(inforowtotalheight, logsrowtotalheight)

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
        scroll = Math.round(clamp(scroll, 0, logrowtotalheight - baseline))
        return { scroll }
      })
    }, 16)
  }, [
    baseline,
    edge.bottom,
    logrowtotalheight,
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
            logrowtotalheight={Math.max(inforowtotalheight, logsrowtotalheight)}
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
