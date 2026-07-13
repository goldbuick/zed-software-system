import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'
export function handleterminalfull(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  useTape.setState((state) => ({
    layout: TAPE_DISPLAY.FULL,
    terminal: {
      ...state.terminal,
      open: true,
    },
  }))
}
