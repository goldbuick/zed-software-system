import {
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import { writeTile } from '../usetiles'

import { BG, FG, setupeditoritem } from './common'
import { Menubar } from './menubar'
import { Textinput } from './textinput'
import { Textrows } from './textrows'

export function TapeConsoleEditor() {
  const context = useWriteText()

  // left - right - bottom of frame
  for (let y = 1; y < context.height - 1; ++y) {
    writeTile(context, context.width, context.height, 0, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
    writeTile(context, context.width, context.height, context.width - 1, y, {
      char: 179,
      color: FG,
      bg: BG,
    })
  }

  const bottomedge = `$205`.repeat(context.width - 2)
  setupeditoritem(false, false, 0, context.height - 1, 0, context)
  tokenizeandwritetextformat(`$212${bottomedge}$190`, context, true)

  return (
    <>
      <Menubar />
      <Textrows />
      <Textinput />
    </>
  )
}
