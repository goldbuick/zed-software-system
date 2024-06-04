import { useSnapshot } from 'valtio'
import { tape_debug, vm_cli } from 'zss/device/api'
import {
  WRITE_TEXT_CONTEXT,
  WriteTextContext,
  tokenizeandwritetextformat,
} from 'zss/gadget/data/textformat'
import { hub } from 'zss/hub'
import { totarget } from 'zss/mapping/string'

import { PlayerContext } from '../useplayer'

import { ActiveItem } from './activeitem'
import { ConsoleContext, tapeinputstate } from './common'
import { ConsoleInput } from './input'
import { TapeConsoleItem } from './item'

type LogputProps = {
  player: string
  rows: string[]
  offsets: number[]
  startrow: number
  context: WRITE_TEXT_CONTEXT
}

export function Logput({
  player,
  rows,
  offsets,
  startrow,
  context,
}: LogputProps) {
  // track active row
  const tapeinput = useSnapshot(tapeinputstate)
  const yscrolled = tapeinput.ycursor - startrow - 2

  // write hint
  const hint = 'if lost try #help'
  context.x = context.width - hint.length
  context.y = 0
  tokenizeandwritetextformat(`$dkcyan${hint}`, context, true)

  return (
    <PlayerContext.Provider value={player}>
      <WriteTextContext.Provider value={context}>
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
          {rows.map((text, index) =>
            index === yscrolled ? (
              <ActiveItem
                key={index}
                text={text}
                offset={offsets[index]}
                context={context}
              />
            ) : (
              <TapeConsoleItem
                key={index}
                text={text}
                offset={offsets[index]}
                context={context}
              />
            ),
          )}
          <ConsoleInput startrow={startrow} />
        </ConsoleContext.Provider>
      </WriteTextContext.Provider>
    </PlayerContext.Provider>
  )
}
