import { useLayoutEffect, useMemo, useState } from 'react'
import { vmcli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { storagereadconfig } from 'zss/feature/storage'
import { useGadgetClient, useTape, useTerminal } from 'zss/gadget/data/state'
import { useWriteText } from 'zss/gadget/hooks'
import { doasync } from 'zss/mapping/func'
import { totarget } from 'zss/mapping/string'
import { MAYBE } from 'zss/mapping/types'
import {
  EMPTY_AUTOCOMPLETE,
  getlineautocomplete,
} from 'zss/screens/tape/autocomplete'
import { TapeBackPlate } from 'zss/screens/tape/backplate'
import { TapeTerminalContext } from 'zss/screens/tape/common'
import { measurerow } from 'zss/screens/tape/measure'
import { textformatreadedges } from 'zss/words/textformat'
import { COLOR } from 'zss/words/types'
import { useShallow } from 'zustand/react/shallow'

import { TerminalInput } from './input'
import { TerminalRows } from './rows'

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

  const [
    wordscli,
    wordsruntime,
    wordsflags,
    wordsstats,
    wordskinds,
    wordsaltkinds,
    wordscolors,
    wordsdirs,
    wordsdirmods,
    wordsexprs,
  ] = useGadgetClient(
    useShallow((state) => [
      state.zsswords.cli,
      state.zsswords.runtime,
      state.zsswords.flags,
      state.zsswords.stats,
      state.zsswords.kinds,
      state.zsswords.altkinds,
      state.zsswords.colors,
      state.zsswords.dirs,
      state.zsswords.dirmods,
      state.zsswords.exprs,
    ]),
  )

  const commandwords = useMemo(() => {
    const words = new Set<string>()
    for (const w of wordscli) words.add(w)
    for (const w of wordsruntime) words.add(w)
    return Array.from(words)
  }, [wordscli, wordsruntime])

  const allwords = useMemo(() => {
    const words = new Set(commandwords)
    for (const w of wordsflags) words.add(w)
    for (const w of wordsstats) words.add(w)
    for (const w of wordskinds) words.add(w)
    for (const w of wordsaltkinds) words.add(w)
    for (const w of wordscolors) words.add(w)
    for (const w of wordsdirs) words.add(w)
    for (const w of wordsdirmods) words.add(w)
    for (const w of wordsexprs) words.add(w)
    return Array.from(words)
  }, [
    commandwords,
    wordsflags,
    wordsstats,
    wordskinds,
    wordsaltkinds,
    wordscolors,
    wordsdirs,
    wordsdirmods,
    wordsexprs,
  ])

  const wordcolors = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of wordscli) map.set(w, COLOR.DKGREEN)
    for (const w of wordsruntime) map.set(w, COLOR.DKGREEN)
    for (const w of wordsflags) map.set(w, COLOR.PURPLE)
    for (const w of wordsstats) map.set(w, COLOR.DKPURPLE)
    for (const w of wordskinds) map.set(w, COLOR.CYAN)
    for (const w of wordsaltkinds) map.set(w, COLOR.DKCYAN)
    for (const w of wordscolors) map.set(w, COLOR.RED)
    for (const w of wordsdirs) map.set(w, COLOR.WHITE)
    for (const w of wordsdirmods) map.set(w, COLOR.LTGRAY)
    for (const w of wordsexprs) map.set(w, COLOR.YELLOW)
    return map
  }, [
    wordscli,
    wordsruntime,
    wordsflags,
    wordsstats,
    wordskinds,
    wordsaltkinds,
    wordscolors,
    wordsdirs,
    wordsdirmods,
    wordsexprs,
  ])

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
  const autocomplete = useMemo(
    () =>
      inputstateactive
        ? getlineautocomplete(
            inputstate,
            tapeterminal.xcursor,
            commandwords,
            allwords,
          )
        : EMPTY_AUTOCOMPLETE,
    [
      inputstate,
      tapeterminal.xcursor,
      inputstateactive,
      commandwords,
      allwords,
    ],
  )

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
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
