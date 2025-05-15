import { useMemo } from 'react'
import { vm_cli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { TAPE_ROW, useTape, useTapeTerminal } from 'zss/gadget/data/state'
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
import { TapeTerminalContext } from '../tape/common'

import { TapeTerminalInput } from './input'
import { TapeTerminalItem } from './item'
import { TapeTerminalItemActive } from './itemactive'

function renderrow(item: TAPE_ROW) {
  const [, maybelevel, source, ...message] = item
  let level = '$white'
  switch (maybelevel) {
    case 'debug':
      level = '$yellow'
      break
    case 'error':
      level = '$red'
      break
  }

  const messagetext = message.map((v) => `${v}`).join(' ')
  const ishyperlink = messagetext.startsWith('!')
  const prefix = `$onclear${level}${source}$white$180$blue`
  return `${ishyperlink ? '!' : ''}${prefix}${messagetext}`
}

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
) {
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

  const top = 0
  const left = 0
  const right = context.width - 1
  const bottom = context.height - 1
  const edge = textformatreadedges(context)
  const xstep = Math.floor(edge.width * 0.5)
  // const ystep = Math.floor(edge.height * 0.5)

  const xleft = useMemo(
    () => forkonedge(left, top, xstep - 1, bottom, context),
    [xstep, top, left, bottom, context],
  )
  const xright = useMemo(
    () => forkonedge(xstep, top, right, bottom, context),
    [xstep, top, right, bottom, context],
  )

  // render to strings
  const inforows: string[] = terminalinfo.map(renderrow)
  const logsrows: string[] = terminallogs.map(renderrow)

  // measure rows
  const inforowheights: number[] = inforows.map((item) => {
    return measurerow(item, edge.width, edge.height)
  })
  const logsrowheights: number[] = logsrows.map((item) => {
    return measurerow(item, edge.width, edge.height)
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
      <BackPlate context={context} />
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
          {inforows.map((text, index) => {
            const y = inforowycoords[index] + tapeinput.scroll
            const yheight = inforowheights[index]
            const ybottom = y + yheight
            if (ybottom < 0 || y > baseline) {
              return null
            }
            return !editoropen && tapeycursor >= y && tapeycursor < ybottom ? (
              <TapeTerminalItemActive key={index} text={text} y={y} />
            ) : (
              <TapeTerminalItem key={index} text={text} y={y} />
            )
          })}
        </WriteTextContext.Provider>
        <WriteTextContext.Provider value={xright}>
          {logsrows.map((text, index) => {
            const y = logsrowycoords[index] + tapeinput.scroll
            const yheight = logsrowheights[index]
            const ybottom = y + yheight
            if (ybottom < 0 || y > baseline) {
              return null
            }
            return !editoropen && tapeycursor >= y && tapeycursor < ybottom ? (
              <TapeTerminalItemActive key={index} text={text} y={y} />
            ) : (
              <TapeTerminalItem key={index} text={text} y={y} />
            )
          })}
        </WriteTextContext.Provider>
        {!editoropen && (
          <TapeTerminalInput
            tapeycursor={tapeycursor}
            logrowtotalheight={inforowtotalheight}
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
