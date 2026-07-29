import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { synctapeactivelayout } from 'zss/feature/tapelayout'
import { useTape } from 'zss/gadget/data/zustandstores'

export function handleterminaltoggle(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  const opening = !useTape.getState().terminal.open
  useTape.setState((state) => ({
    terminalmode: opening ? 'cli' : state.terminalmode,
    terminal: {
      ...state.terminal,
      open: !state.terminal.open,
    },
  }))
  synctapeactivelayout()
}
