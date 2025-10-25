import { INPUT } from 'zss/gadget/data/types'
import { useDeviceData } from 'zss/gadget/hooks'
import { inputdown, inputup } from 'zss/gadget/userinput'

export function handlestickclear() {
  inputup(0, INPUT.MOVE_UP)
  inputup(0, INPUT.MOVE_DOWN)
  inputup(0, INPUT.MOVE_LEFT)
  inputup(0, INPUT.MOVE_RIGHT)
}

export function handlestickdir(snapdir: number) {
  const { keyboardshift, keyboardctrl, keyboardalt } = useDeviceData.getState()

  if (keyboardalt) {
    inputdown(0, INPUT.ALT)
  } else {
    inputup(0, INPUT.ALT)
  }
  if (keyboardctrl) {
    inputdown(0, INPUT.CTRL)
  } else {
    inputup(0, INPUT.CTRL)
  }
  if (keyboardshift) {
    inputdown(0, INPUT.SHIFT)
  } else {
    inputup(0, INPUT.SHIFT)
  }

  handlestickclear()

  switch (snapdir) {
    case 0:
      // left
      inputdown(0, INPUT.MOVE_LEFT)
      break
    case 45:
      // left up
      inputdown(0, INPUT.MOVE_UP)
      inputdown(0, INPUT.MOVE_LEFT)
      break
    case 90:
      // up
      inputdown(0, INPUT.MOVE_UP)
      break
    case 135:
      // up right
      inputdown(0, INPUT.MOVE_UP)
      inputdown(0, INPUT.MOVE_RIGHT)
      break
    case 180:
      // right
      inputdown(0, INPUT.MOVE_RIGHT)
      break
    case 225:
      // right down
      inputdown(0, INPUT.MOVE_DOWN)
      inputdown(0, INPUT.MOVE_RIGHT)
      break
    case 270:
      // down
      inputdown(0, INPUT.MOVE_DOWN)
      break
    case 315:
      // down left
      inputdown(0, INPUT.MOVE_DOWN)
      inputdown(0, INPUT.MOVE_LEFT)
      break
    case 360:
      // left
      inputdown(0, INPUT.MOVE_LEFT)
      break
  }
}
