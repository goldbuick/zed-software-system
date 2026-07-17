import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { detachwanixterm } from 'zss/device/wanixclient/wanixdisplay'
import { useTape } from 'zss/gadget/data/zustandstores'
export function handleterminaltoggle(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  const opening = !useTape.getState().terminal.open
  if (opening) {
    detachwanixterm()
  }
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      open: !state.terminal.open,
    },
  }))
}
