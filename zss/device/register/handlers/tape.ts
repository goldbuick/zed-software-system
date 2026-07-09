import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { terminaladdlog } from 'zss/device/register/helpers/terminallog'
import {
  readtoasttimer,
  readworkstatustimer,
  settoasttimer,
  setworkstatustimer,
} from 'zss/device/register/state'
import { useGadgetClient, useTape } from 'zss/gadget/data/zustandstores'
import { ispresent, isstring } from 'zss/mapping/types'

export function handlelog(_device: DEVICE, message: MESSAGE): void {
  terminaladdlog(message)
}

export function handlechat(_device: DEVICE, message: MESSAGE): void {
  const currentboard = useGadgetClient.getState().gadget.board
  if (message.player === '' || message.player === currentboard) {
    terminaladdlog(message)
  }
}

export function handletoast(_device: DEVICE, message: MESSAGE): void {
  if (ispresent(message.data)) {
    clearTimeout(readtoasttimer())
    useTape.setState({ toast: message.data })
    const holdratio = Math.max(message.data.length * 150, 3000)
    const hold = Math.min(holdratio, 14000)
    settoasttimer(setTimeout(() => useTape.setState({ toast: '' }), hold))
  }
}

export function handleworkstatus(_device: DEVICE, message: MESSAGE): void {
  if (isstring(message.data)) {
    clearTimeout(readworkstatustimer())
    useTape.setState({ workstatus: message.data })
    if (message.data) {
      setworkstatustimer(
        setTimeout(() => useTape.setState({ workstatus: '' }), 2000),
      )
    }
  }
}
