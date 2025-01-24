import { vm_cli } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { useTape, useTapeTerminal } from 'zss/gadget/data/state'
import { totarget } from 'zss/mapping/string'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
} from 'zss/words/textformat'
import { useShallow } from 'zustand/react/shallow'

import { useWriteText } from '../hooks'
import { BackPlate } from '../tape/backplate'
import { ConsoleContext } from '../tape/common'

import { ConsoleInput } from './input'
import { ConsoleItem } from './item'
import { ConsoleItemActive } from './itemactive'

export function TapeConsole() {
  const player = registerreadplayer()
  const [editoropen] = useTape(useShallow((state) => [state.editor.open]))
  const terminallogs = useTape(useShallow((state) => state.terminal.logs))

  const context = useWriteText()
  const tapeinput = useTapeTerminal()
  const edge = textformatreadedges(context)

  // render to strings
  const logrows: string[] = terminallogs.map((item) => {
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
    const prefix = `$blue${level}${source}$blue$180$blue`
    return `${ishyperlink ? '!' : ''}${prefix}${messagetext}`
  })

  // measure rows
  const logrowheights: number[] = logrows.map((item) => {
    if (item.startsWith('!')) {
      return 1
    }
    const measure = tokenizeandmeasuretextformat(item, edge.width, edge.height)
    return measure?.y ?? 1
  })

  // baseline
  const baseline = edge.bottom - edge.top - (editoropen ? 0 : 2)

  // upper bound on ycursor
  let logrowtotalheight = 0
  let logrowycoord = baseline + 1

  // ycoords for rows
  const logrowycoords: number[] = logrowheights.map((rowheight) => {
    logrowycoord -= rowheight
    logrowtotalheight += rowheight
    return logrowycoord
  })
  ++logrowtotalheight

  // calculate ycoord to render cursor
  const tapeycursor = edge.bottom - tapeinput.ycursor + tapeinput.scroll

  return (
    <>
      <BackPlate context={context} />
      <ConsoleContext.Provider
        value={{
          sendmessage(maybetarget, data) {
            const [target, message] = totarget(maybetarget)
            if (target === 'self') {
              const input = `#${message} ${data ?? ''}`
              vm_cli(SOFTWARE, input, player)
            } else {
              SOFTWARE.emit(`${target}:${message}`, data, player)
            }
          },
        }}
      >
        {logrows.map((text, index) => {
          const y = logrowycoords[index] + tapeinput.scroll
          const yheight = logrowheights[index]
          const ybottom = y + yheight
          if (ybottom < 0 || y > baseline) {
            return null
          }
          return !editoropen && tapeycursor >= y && tapeycursor < ybottom ? (
            <ConsoleItemActive key={index} text={text} y={y} />
          ) : (
            <ConsoleItem key={index} text={text} y={y} />
          )
        })}
        {!editoropen && (
          <ConsoleInput
            tapeycursor={tapeycursor}
            logrowtotalheight={logrowtotalheight}
          />
        )}
      </ConsoleContext.Provider>
    </>
  )
}
