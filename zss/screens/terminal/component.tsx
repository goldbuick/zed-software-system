import { useLayoutEffect, useMemo, useState } from 'react'
import { vmcli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfig } from 'zss/feature/storage'
import { useTape, useTerminal } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/hooks'
import { doasync } from 'zss/mapping/func'
import { totarget } from 'zss/mapping/string'
import { MAYBE } from 'zss/mapping/types'
import {
  EMPTY_AUTOCOMPLETE,
  getautocomplete,
} from 'zss/screens/tape/autocomplete'
import { TapeBackPlate } from 'zss/screens/tape/backplate'
import { TapeTerminalContext } from 'zss/screens/tape/common'
import { measurerow } from 'zss/screens/tape/measure'
import {
  buildWordColorMap,
  useZssWords,
} from 'zss/screens/tape/zsswords'
import { textformatreadedges } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'

import { TerminalInput } from './input'
import { TerminalRows } from './rows'
import { tokenizeline } from './terminalinputhelpers'

export function TerminalComponent() {
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

  const { words, commandwords, statwords, allwords } = useZssWords()
  const wordcolors = useMemo(
    () =>
      buildWordColorMap(words, {
        command: COLOR.DKGREEN,
        flag: COLOR.PURPLE,
        stat: COLOR.DKPURPLE,
        kind: COLOR.CYAN,
        kindAlt: COLOR.DKCYAN,
        color: COLOR.RED,
        dir: COLOR.WHITE,
        dirmod: COLOR.LTGRAY,
        exprs: COLOR.YELLOW,
      }),
    [words],
  )

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

  const inputstate = tapeterminal.buffer[tapeterminal.bufferindex]
  const inputstateactive = tapeterminal.ycursor === 0
  const linetokens = useMemo(
    () => (inputstateactive ? tokenizeline(inputstate) : []),
    [inputstate, inputstateactive],
  )
  const autocomplete = useMemo(() => {
    if (!inputstateactive) {
      return EMPTY_AUTOCOMPLETE
    }
    const lineWithNewline = inputstate + '\n'
    const rows = [
      {
        start: 0,
        code: lineWithNewline,
        end: inputstate.length,
        tokens: linetokens,
      },
    ]
    return getautocomplete(
      rows,
      tapeterminal.xcursor,
      0,
      commandwords,
      statwords,
      allwords,
    )
  }, [
    inputstateactive,
    inputstate,
    tapeterminal.xcursor,
    linetokens,
    commandwords,
    statwords,
    allwords,
  ])

  return (
    <>
      <TapeBackPlate />
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
          <TerminalInput
            quickterminal={quickterminal}
            voice2text={voice2text}
            tapeycursor={tapeycursor}
            logrowtotalheight={logsrowtotalheight}
            autocomplete={autocomplete}
            wordcolors={wordcolors}
            linetokens={linetokens}
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
