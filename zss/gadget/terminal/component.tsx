import { useMemo } from 'react'
import { vm_cli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useTape, useTapeTerminal } from 'zss/gadget/data/state'
import { totarget } from 'zss/mapping/string'
import { deepcopy } from 'zss/mapping/types'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
  WRITE_TEXT_CONTEXT,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { useWriteText, WriteTextContext } from '../hooks'
import { BackPlate } from '../tape/backplate'
import { TapeTerminalContext, terminalsplit } from '../tape/common'

import { TapeTerminalInput } from './input'
import { TapeTerminalItem } from './item'
import { TapeTerminalItemActive } from './itemactive'

function measurerow(item: string, width: number, height: number) {
  if (item.startsWith('!')) {
    return 1
  }
  const measure = tokenizeandmeasuretextformat(item, width, height)
  return measure?.y ?? 1
}

function forkonedge(
  leftedge: number,
  topedge: number,
  rightedge: number,
  bottomedge: number,
  context: WRITE_TEXT_CONTEXT,
): WRITE_TEXT_CONTEXT {
  return {
    ...context,
    x: leftedge,
    y: topedge,
    reset: {
      ...deepcopy(context.reset),
      topedge,
      leftedge,
      rightedge,
      bottomedge,
    },
    active: {
      ...deepcopy(context.active),
      topedge,
      leftedge,
      rightedge,
      bottomedge,
    },
  }
}

export function TapeTerminal() {
  const player = registerreadplayer()
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))
  const terminalinfo = useTape(useShallow((state) => state.terminal.info))
  const terminallogs = useTape(useShallow((state) => state.terminal.logs))

  const context = useWriteText()
  const tapeinput = useTapeTerminal()

  // wide terminal
  const xstep = terminalsplit(context.width)

  const top = 0
  const left = 0
  const right = context.width - 1
  const bottom = context.height - 1
  const edge = textformatreadedges(context)

  const xleft = useMemo(
    () => forkonedge(left, top, xstep - 1, bottom, context),
    [xstep, top, left, bottom, context],
  )
  const xright = useMemo(
    () => forkonedge(xstep + 1, top, right, bottom, context),
    [xstep, top, right, bottom, context],
  )

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

  // upper bound on ycursor
  let inforowtotalheight = 0
  let inforowycoord = baseline + 1

  // ycoords for rows
  const inforowycoords: number[] = inforowheights.map((rowheight) => {
    inforowycoord -= rowheight
    inforowtotalheight += rowheight
    return inforowycoord
  })
  ++inforowtotalheight

  let logsrowtotalheight = 0
  let logsrowycoord = baseline + 1

  // ycoords for rows
  const logsrowycoords: number[] = logsrowheights.map((rowheight) => {
    logsrowycoord -= rowheight
    logsrowtotalheight += rowheight
    return logsrowycoord
  })
  ++logsrowtotalheight

  // calculate ycoord to render cursor
  const tapeycursor = edge.bottom - tapeinput.ycursor + tapeinput.scroll

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
        <WriteTextContext.Provider value={xleft}>
          {terminalinfo.map((text, index) => {
            const y = inforowycoords[index] + tapeinput.scroll
            const yheight = inforowheights[index]
            const ybottom = y + yheight
            if (ybottom < 0 || y > baseline) {
              return null
            }
            return !editoropen &&
              tapeinput.xcursor < xstep &&
              tapeycursor >= y &&
              tapeycursor < ybottom ? (
              <TapeTerminalItemActive key={index} text={text} y={y} />
            ) : (
              <TapeTerminalItem key={index} text={text} y={y} />
            )
          })}
        </WriteTextContext.Provider>
        <WriteTextContext.Provider value={xright}>
          {terminallogs.map((text, index) => {
            const y = logsrowycoords[index] + tapeinput.scroll
            const yheight = logsrowheights[index]
            const ybottom = y + yheight
            if (ybottom < 0 || y > baseline) {
              return null
            }
            return !editoropen &&
              tapeinput.xcursor >= xstep &&
              tapeycursor >= y &&
              tapeycursor < ybottom ? (
              <TapeTerminalItemActive key={index} text={text} y={y} />
            ) : (
              <TapeTerminalItem key={index} text={text} y={y} />
            )
          })}
        </WriteTextContext.Provider>
        {!editoropen && (
          <TapeTerminalInput
            tapeycursor={tapeycursor}
            logrowtotalheight={Math.max(inforowtotalheight, logsrowtotalheight)}
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
