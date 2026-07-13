import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { useTape } from 'zss/gadget/data/zustandstores'
export function handleterminaltoggle(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      open: !state.terminal.open,
    },
  }))
}
