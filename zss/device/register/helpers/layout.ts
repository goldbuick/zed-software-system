import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'

export function terminalinclayout(inc: boolean): void {
  const { layout } = useTape.getState()
  const step = inc ? 1 : -1
  let nextlayout = (layout as number) + step
  if (nextlayout < 0) {
    nextlayout += TAPE_DISPLAY.MAX
  }
  if (nextlayout >= (TAPE_DISPLAY.MAX as number)) {
    nextlayout -= TAPE_DISPLAY.MAX
  }
  useTape.setState({ layout: nextlayout })
}
