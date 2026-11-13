import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { synctapeactivelayout } from 'zss/feature/tapelayout'
import { useTape } from 'zss/gadget/data/zustandstores'
import { mobiletextblur } from 'zss/gadget/mobiletext'

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
  mobiletextblur()
  synctapeactivelayout()
}
