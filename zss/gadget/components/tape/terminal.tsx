import { vm_cli } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { useTape } from 'zss/device/tape'
import {
  textformatreadedges,
  tokenizeandmeasuretextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'
import { hub } from 'zss/hub'
import { totarget } from 'zss/mapping/string'

import { ConsoleContext, useTapeTerminal } from './common'
import { BackPlate } from './elements/backplate'
import { TerminalInput } from './elements/terminalinput'
import { TerminalItem } from './elements/terminalitem'
import { TerminalItemActive } from './elements/terminalitemactive'

export function TapeTerminal() {
  const tape = useTape()
  const context = useWriteText()
  const tapeinput = useTapeTerminal()
  const edge = textformatreadedges(context)

  // render to strings
  const logrows: string[] = tape.terminal.logs.map((item) => {
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
    const prefix = `$blue[${level}${source}$blue]`
    return `${ishyperlink ? '!' : ''}${prefix} ${messagetext}`
  })

  // measure rows
  const logrowheights: number[] = logrows.map((item) => {
    if (item.startsWith('!')) {
      return 1
    }
    const measure = tokenizeandmeasuretextformat(item, edge.width, edge.height)
    return measure?.y ?? 1
  })

  // upper bound on ycursor
  let logrowtotalheight = 0
  let logrowycoord = edge.bottom - 1

  // ycoords for rows
  const logrowycoords: number[] = logrowheights.map((rowheight) => {
    logrowycoord -= rowheight
    logrowtotalheight += rowheight
    return logrowycoord
  })
  ++logrowtotalheight

  // calculate ycoord to render cursor
  const tapeycursor = edge.bottom - tapeinput.ycursor + tapeinput.scroll

  // user id
  const player = gadgetstategetplayer()

  return (
    <>
      <BackPlate context={context} />
      <ConsoleContext.Provider
        value={{
          sendmessage(maybetarget, data) {
            const [target, message] = totarget(maybetarget)
            if (target === 'self') {
              const input = `#${message} ${data ?? ''}`
              vm_cli('tape', input, player)
            } else {
              hub.emit(`${target}:${message}`, 'gadget', data, player)
            }
          },
        }}
      >
        {logrows.map((text, index) => {
          const y = logrowycoords[index] + tapeinput.scroll
          const yheight = logrowheights[index]
          const ybottom = y + yheight
          if (ybottom < 0 || y > edge.bottom - 1) {
            return null
          }
          return !tape.editor.open &&
            tapeycursor >= y &&
            tapeycursor < ybottom ? (
            <TerminalItemActive key={index} text={text} y={y} />
          ) : (
            <TerminalItem key={index} text={text} y={y} />
          )
        })}
        {!tape.editor.open && (
          <TerminalInput
            tapeycursor={tapeycursor}
            logrowtotalheight={logrowtotalheight}
          />
        )}
      </ConsoleContext.Provider>
    </>
  )
}
