import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { detachwanixterm } from 'zss/device/wanixclient/wanixdisplay'
import {
  readtapelayoutmodality,
  writetapelayoutslot,
} from 'zss/feature/tapelayout'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'

export function handleterminalfull(device: DEVICE, message: MESSAGE): void {
  void device
  void message
  detachwanixterm()
  useTape.setState((state) => ({
    terminal: {
      ...state.terminal,
      open: true,
    },
  }))
  writetapelayoutslot(readtapelayoutmodality(), TAPE_DISPLAY.FULL)
}
