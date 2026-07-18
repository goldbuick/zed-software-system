import {
  readtapelayoutmodality,
  writetapelayoutslot,
} from 'zss/feature/tapelayout'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'

export function terminalinclayout(inc: boolean): void {
  const modality = readtapelayoutmodality()
  const { layoutby } = useTape.getState()
  const current = layoutby[modality]
  const step = inc ? 1 : -1
  let nextlayout = (current as number) + step
  if (nextlayout < 0) {
    nextlayout += TAPE_DISPLAY.MAX
  }
  if (nextlayout >= (TAPE_DISPLAY.MAX as number)) {
    nextlayout -= TAPE_DISPLAY.MAX
  }
  writetapelayoutslot(modality, nextlayout as TAPE_DISPLAY)
}
