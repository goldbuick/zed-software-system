import { vm_cli } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { useTape } from 'zss/device/tape'
import {
  tokenizeandmeasuretextformat,
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'
import { hub } from 'zss/hub'
import { clamp } from 'zss/mapping/number'
import { totarget } from 'zss/mapping/string'

import { BKG_PTRN, ConsoleContext, setuplogitem, useTapeInput } from './common'
import { TerminalInput } from './elements/terminalinput'
import { TerminalItem } from './elements/terminalitem'
import { TerminalItemActive } from './elements/terminalitemactive'

export function TapeTerminal() {
  const context = useWriteText()

  const tape = useTape()
  const tapeinput = useTapeInput()

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
    const measure = tokenizeandmeasuretextformat(
      item,
      context.width,
      context.height,
    )
    return measure?.y ?? 1
  })

  // upper bound on ycursor
  const bottomedge = context.height - 3
  let logrowtotalheight = 0
  let logrowycoord = bottomedge + 1
  // ycoords for rows
  const logrowycoords: number[] = logrowheights.map((rowheight) => {
    logrowycoord -= rowheight
    logrowtotalheight += rowheight
    return logrowycoord
  })
  ++logrowtotalheight

  // offset into logs
  const ycursorbottom = context.height - 1
  const halfvisiblerows = Math.round(context.height * 0.5)
  const ycursor = tapeinput.ycursor - halfvisiblerows
  const yoffset = clamp(ycursor, 0, logrowtotalheight - halfvisiblerows)

  // calculate ycoord to render cursor
  const tapeycursor = ycursorbottom - tapeinput.ycursor + yoffset

  // write blanks & hint
  const padding = -(logrowtotalheight - yoffset - ycursorbottom)
  for (let i = 0; i < padding; ++i) {
    setuplogitem(false, false, i, context)
    context.writefullwidth = BKG_PTRN
    tokenizeandwritetextformat('', context, true)
    context.writefullwidth = undefined
  }

  setuplogitem(false, false, 0, context)
  const hint = 'if lost try #help'
  context.x = context.width - hint.length
  tokenizeandwritetextformat(`$dkcyan${hint}`, context, true)

  // user id
  const player = gadgetstategetplayer()

  return (
    <>
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
          const y = logrowycoords[index] + yoffset
          const yheight = logrowheights[index]
          const ybottom = y + yheight
          if (ybottom < 0 || y > bottomedge) {
            return null
          }
          return tapeycursor >= y && tapeycursor < ybottom ? (
            <TerminalItemActive key={index} text={text} y={y} />
          ) : (
            <TerminalItem key={index} text={text} y={y} />
          )
        })}
        <TerminalInput
          tapeycursor={tapeycursor}
          logrowtotalheight={logrowtotalheight}
        />
      </ConsoleContext.Provider>
    </>
  )
}
