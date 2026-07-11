import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { useTape } from 'zss/gadget/data/zustandstores'

export function handleterminalclose(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  useTape.setState((state) => ({
    terminalmode: 'cli',
    terminal: {
      ...state.terminal,
      open: false,
    },
  }))
}
