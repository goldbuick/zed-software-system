import { user } from 'zss/feature/keyboard'
import { useDeviceData } from 'zss/gadget/hooks'
import { noop } from 'zss/mapping/types'

export function handlestickdir(snapdir: number) {
  const { keyboardshift, keyboardctrl, keyboardalt } = useDeviceData.getState()

  let keypress = ''
  if (keyboardalt) {
    keypress += `{Alt>}`
  }
  if (keyboardctrl) {
    keypress += `{Ctrl>}`
  }
  if (keyboardshift) {
    keypress += `{Shift>}`
  }
  switch (snapdir) {
    case 0:
      // left
      keypress += '[ArrowLeft]'
      break
    case 45:
      // left up
      keypress += '[ArrowLeft][ArrowUp]'
      break
    case 90:
      // up
      keypress += '[ArrowUp]'
      break
    case 135:
      // up right
      keypress += '[ArrowRight][ArrowUp]'
      break
    case 180:
      // right
      keypress += '[ArrowRight]'
      break
    case 225:
      // right down
      keypress += '[ArrowRight][ArrowDown]'
      break
    case 270:
      // down
      keypress += '[ArrowDown]'
      break
    case 315:
      // down left
      keypress += '[ArrowLeft][ArrowDown]'
      break
    case 360:
      // left
      keypress += '[ArrowLeft]'
      break
  }
  if (keyboardalt) {
    keypress += `{/Alt}`
  }
  if (keyboardctrl) {
    keypress += `{/Ctrl}`
  }
  if (keyboardshift) {
    keypress += `{/Shift}`
  }

  user.keyboard(keypress).catch(noop)
}
