import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { INPUT } from 'zss/gadget/data/types'
import { inputdown, inputup } from 'zss/gadget/userinput'
import { isarray } from 'zss/mapping/types'

export function handleinput(_device: DEVICE, message: MESSAGE): void {
  if (isarray(message.data)) {
    const [input, shift] = message.data as [INPUT, boolean]
    if (shift) {
      inputdown(0, INPUT.SHIFT)
      inputdown(0, input)
      inputup(0, input)
      inputup(0, INPUT.SHIFT)
    } else {
      inputdown(0, input)
      inputup(0, input)
    }
  }
}
