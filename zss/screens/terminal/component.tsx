import { useLayoutEffect, useMemo, useState } from 'react'
import { chipmessage, vmcli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfig } from 'zss/feature/storage'
import { useTape, useTerminal } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/writetext'
import { doasync } from 'zss/mapping/func'
import { totarget } from 'zss/mapping/string'
import { MAYBE } from 'zss/mapping/types'
import { perfmeasure } from 'zss/perf/ui'
import { TapeBackPlate } from 'zss/screens/tape/backplate'
import { TapeTerminalContext } from 'zss/screens/tape/common'
import { measurerowcached } from 'zss/screens/terminal/measurerowcache'
import { textformatreadedges } from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { TerminalInput } from './input'
import { TerminalRows } from './rows'
import { WanixTermInput } from './wanixinput'
import { WanixTermScreen } from './wanixscreen'

export function TerminalComponent() {
  const player = registerreadplayer()
  const editoropen = useTape((state) => state.editor.open)
  const terminalmode = useTape((state) => state.terminalmode)
  const pinlines = useTape((state) => state.terminal.pinlines)
  const sessionlogs = useTape((state) => state.terminal.logs)
  const terminallogs = useMemo(
    () => [...pinlines, ...sessionlogs],
    [pinlines, sessionlogs],
  )

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
  const logsrowheights: number[] = useMemo(() => {
    const logs = terminallogs ?? []
    return perfmeasure('terminal:measurerows', () =>
      logs.map((item) => measurerowcached(item, logsrowmaxwidth, edge.height)),
    )
  }, [edge.height, logsrowmaxwidth, terminallogs])

  let logsrowtotalheight = 0
  logsrowheights.forEach((rowheight) => {
    logsrowtotalheight += rowheight
  })
  ++logsrowtotalheight

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

  const attached = terminalmode === 'attached'

  return (
  <>
    {!attached && <TapeBackPlate />}
    <TapeTerminalContext.Provider value={tapecontextvalue}>
      {attached ? (
        <>
          <WanixTermScreen />
          <WanixTermInput />
        </>
      ) : (
        <>
          <TerminalRows />
          {!editoropen && voice2text !== undefined && (
            <TerminalInput
              terminalmode={terminalmode}
              voice2text={voice2text}
              tapeycursor={tapeycursor}
              logrowtotalheight={logsrowtotalheight}
            />
          )}
        </>
      )}
    </TapeTerminalContext.Provider>
  </>
  )
}
