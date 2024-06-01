import {
  WRITE_TEXT_CONTEXT,
  WriteTextContext,
  tokenizeandwritetextformat,
} from 'zss/gadget/data/textformat'

import { PlayerContext } from '../useplayer'

import { ConsoleInput } from './consoleinput'
import { ConsoleItem } from './consoleitem'

type LogputProps = {
  player: string
  selected: number
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
  // write hint
  const hint = 'if lost try #help'
  context.x = context.width - hint.length
  context.y = 0
  tokenizeandwritetextformat(`$dkcyan${hint}`, context, true)

  return (
    <PlayerContext.Provider value={player}>
      <WriteTextContext.Provider value={context}>
        {rows.map((text, index) => (
          <ConsoleItem key={index} text={text} offset={offsets[index]} />
        ))}
        <ConsoleInput startrow={startrow} />
      </WriteTextContext.Provider>
    </PlayerContext.Provider>
  )
}
