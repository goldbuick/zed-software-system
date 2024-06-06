import { WRITE_TEXT_CONTEXT } from 'zss/gadget/data/textformat'
import { TILES } from 'zss/gadget/data/types'

import { UserInput, modsfromevent } from '../userinput'

type TapeConsoleEditorProps = {
  tiles: TILES
  width: number
  height: number
  context: WRITE_TEXT_CONTEXT
}

export function TapeConsoleEditor({
  tiles,
  width,
  height,
  context,
}: TapeConsoleEditorProps) {
  //

  return (
    <>
      <UserInput
        keydown={(event) => {
          const mods = modsfromevent(event)
          console.info(mods, event.key)
        }}
      />
    </>
  )
}
