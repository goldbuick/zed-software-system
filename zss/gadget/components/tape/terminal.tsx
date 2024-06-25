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

import { ConsoleContext, logitemy, useTapeInput } from './common'
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
  let logrowtotalheight = 0
  // ycoords for rows
  const logrowoffsets: number[] = logrowheights.map((rowheight) => {
    const y = logrowtotalheight + rowheight - 1
    logrowtotalheight += rowheight
    return -y // flipped y render
  })
  ++logrowtotalheight

  // offset into logs
  const centerrow = Math.round(tapeinput.ycursor - context.height * 0.5)
  const maxvisiblerows = context.height - 2
  const startrow = clamp(
    centerrow,
    0,
    tape.terminal.logs.length - maxvisiblerows,
  )

  // starting render row
  const visiblelogrows = logrows.slice(startrow, startrow + maxvisiblerows)

  // calculate ycoord to render cursor
  const bottomedge = context.height - 1
  const yscrolled = tapeinput.ycursor - startrow
  const tapeycursor = bottomedge - yscrolled

  // write hint
  const hint = 'if lost try #help'
  context.x = context.width - hint.length
  context.y = 0
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
        {visiblelogrows.map((text, index) => {
          const offset = logrowoffsets[index]
          const yrow = logitemy(offset, context)
          const yheight = logrowheights[index] - 1
          return tapeycursor >= yrow && tapeycursor <= yrow + yheight ? (
            <TerminalItemActive key={index} text={text} offset={offset} />
          ) : (
            <TerminalItem key={index} text={text} offset={offset} />
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
