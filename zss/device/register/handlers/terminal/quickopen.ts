import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/types'
import { detachwanixterm } from 'zss/device/wanixclient/wanixdisplay'
import {
  TAPE_DISPLAY,
  useTape,
  useTerminal,
} from 'zss/gadget/data/zustandstores'
import { isstring } from 'zss/mapping/types'
export function handleterminalquickopen(
  _device: DEVICE,
  message: MESSAGE,
): void {
  if (isstring(message.data)) {
    const buffer = useTerminal.getState().buffer
    buffer[0] = message.data
    useTerminal.setState({
      buffer,
      bufferindex: 0,
      xcursor: message.data.length,
      ycursor: 0,
      xselect: undefined,
      yselect: undefined,
    })
  }
  detachwanixterm()
  useTape.setState({ terminalmode: 'quick', layout: TAPE_DISPLAY.TOP })
}
