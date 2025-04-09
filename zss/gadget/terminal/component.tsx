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
import { TapeTerminalContext } from '../tape/common'

import { TapeTerminalInput } from './input'
import { TapeTerminalItem } from './item'
import { TapeTerminalItemActive } from './itemactive'

export function TapeTerminal() {
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
    const prefix = `$onclear${level}${source}$white$180$blue`
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
      <TapeTerminalContext.Provider
        value={{
          sendmessage(maybetarget, data) {
            const [target, message] = totarget(maybetarget)
            if (target === 'self') {
              const input = `#${message} ${data.join(' ')}`
              vm_cli(SOFTWARE, input, player)
            } else {
              SOFTWARE.emit(player, `${target}:${message}`, data)
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
            <TapeTerminalItemActive key={index} text={text} y={y} />
          ) : (
            <TapeTerminalItem key={index} text={text} y={y} />
          )
        })}
        {!editoropen && (
          <TapeTerminalInput
            tapeycursor={tapeycursor}
            logrowtotalheight={logrowtotalheight}
          />
        )}
      </TapeTerminalContext.Provider>
    </>
  )
}
