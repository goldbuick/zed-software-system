import {
  WRITE_TEXT_CONTEXT,
  WriteTextContext,
} from 'zss/gadget/data/textformat'

import { PlayerContext } from '../useplayer'

import { CONSOLE_ROW, ConsoleItem } from './consoleitem'

type LogputProps = {
  player: string
  context: WRITE_TEXT_CONTEXT
  rows: CONSOLE_ROW[]
}

export function Logput({ player, context, rows }: LogputProps) {
  const selected = 0

  return (
    <PlayerContext.Provider value={player}>
      <WriteTextContext.Provider value={context}>
        {rows.map((item, index) => (
          <ConsoleItem
            key={item[0]}
            row={item}
            active={index === selected}
            width={context.width}
            height={context.height}
          />
        ))}
      </WriteTextContext.Provider>
    </PlayerContext.Provider>
  )
}
