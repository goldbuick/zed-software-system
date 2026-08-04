import { useLayoutEffect, useMemo, useState } from 'react'
import { chipmessage, vmcli } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfig } from 'zss/feature/storage'
import { useTape, useTerminal } from 'zss/gadget/data/zustandstores'
import { useWriteText } from 'zss/gadget/writetext'
import { totarget } from 'zss/mapping/string'
import { MAYBE } from 'zss/mapping/types'
import { perfmeasure } from 'zss/perf/ui'
import { useLinkEditingKey } from 'zss/screens/linkui/linkediting'
import { TapeBackPlate } from 'zss/screens/tape/backplate'
import { TapeTerminalContext } from 'zss/screens/tape/common'
import {
  readlogrowtotalheight,
  readterminallayout,
} from 'zss/screens/terminal/terminallayout'
import { textformatreadedges } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { TerminalInput } from './input'
import { TerminalRows } from './rows'

export function TerminalComponent() {
  const player = registerreadplayer()
  const terminalmode = useTape((state) => state.terminalmode)
  const pinlines = useTape((state) => state.terminal.pinlines)
  const sessionlogs = useTape((state) => state.terminal.logs)
  const editingkey = useLinkEditingKey()

  const [voice2text, setvoice2text] = useState<MAYBE<boolean>>(undefined)
  useLayoutEffect(() => {
    doasync(SOFTWARE, registerreadplayer(), async () => {
      const voice2text = await storagereadconfig('voice2text')
      setvoice2text(voice2text === 'on')
    })
  }, [])

  const context = useWriteText()
  const tapeterminal = useTerminal(
    useShallow((state) => ({
      ycursor: state.ycursor,
      scroll: state.scroll,
    })),
  )

  const edge = textformatreadedges(context)
  const logsrowmaxwidth = context.width - 1

  const layout = useMemo(() => {
    // editingkey invalidates row heights (measurerowcached reads it)
    void editingkey
    return readterminallayout({
      pinlines,
      sessionlogs,
      maxwidth: logsrowmaxwidth,
      edge,
    })
  }, [pinlines, sessionlogs, logsrowmaxwidth, edge, editingkey])

  const logrowtotalheight = useMemo(
    () =>
      perfmeasure('terminal:measurerows', () =>
        readlogrowtotalheight(layout.pinheights, layout.sessionheights),
      ),
    [layout.pinheights, layout.sessionheights],
  )

  const tapeycursor = edge.bottom - tapeterminal.ycursor + tapeterminal.scroll

  const tapecontextvalue = useMemo(
    () => ({
      sendmessage(chip: string, maybetarget: string, data: any[]) {
        const [target, message] = totarget(maybetarget)
        if (target === 'self') {
          const input = `#${message} ${data.join(' ')}`
          vmcli(SOFTWARE, player, input)
        } else {
          chipmessage(SOFTWARE, player, chip, maybetarget, data)
        }
      },
    }),
    [player],
  )

  return (
    <>
      <TapeBackPlate />
      <TapeTerminalContext.Provider value={tapecontextvalue}>
        <TerminalRows />
        {voice2text !== undefined && (
          <TerminalInput
            terminalmode={terminalmode}
            voice2text={voice2text}
            tapeycursor={tapeycursor}
            logrowtotalheight={logrowtotalheight}
            logzoneheight={layout.logzoneheight}
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
