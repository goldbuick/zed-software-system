import { useLayoutEffect, useMemo, useState, useEffect } from 'react'
import { chipmessage, vmcli } from 'zss/device/api'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfig } from 'zss/feature/storage'
import { useTape, useTerminal } from 'zss/gadget/data/zustandstores'
import { useWriteText } from 'zss/gadget/writetext'
import { totarget } from 'zss/mapping/string'
import { MAYBE } from 'zss/mapping/types'
import { perfmeasure } from 'zss/perf/ui'
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
import { WanixTermScreen } from './wanixtermscreen'
import { WanixTermSizeSync } from './wanixtermsizesync'
import {
  readattachedsession,
  subscribewanixattach,
} from 'zss/feature/wanix/wanixattachstate'

export function TerminalComponent() {
  const player = registerreadplayer()
  const editoropen = useTape((state) => state.editor.open)
  const terminalmode = useTape((state) => state.terminalmode)
  const pinlines = useTape((state) => state.terminal.pinlines)
  const sessionlogs = useTape((state) => state.terminal.logs)

  const [voice2text, setvoice2text] = useState<MAYBE<boolean>>(undefined)
  const [attachedsession, setattachedsession] = useState(readattachedsession)
  useEffect(
    () => subscribewanixattach(() => setattachedsession(readattachedsession())),
    [],
  )
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

  const layout = useMemo(
    () =>
      readterminallayout({
        pinlines,
        sessionlogs,
        maxwidth: logsrowmaxwidth,
        edge,
        editoropen,
      }),
    [pinlines, sessionlogs, logsrowmaxwidth, edge, editoropen],
  )

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
      <WanixTermSizeSync />
      <TapeBackPlate />
      <TapeTerminalContext.Provider value={tapecontextvalue}>
        {attachedsession ? (
          <WanixTermScreen />
        ) : (
          <TerminalRows />
        )}
        {!editoropen && !attachedsession && voice2text !== undefined && (
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
