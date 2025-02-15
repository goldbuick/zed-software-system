// import userEvent from '@testing-library/user-event'

import { user } from 'zss/mapping/keyboard'
import { noop } from 'zss/mapping/types'

// trigger user events

export function handlestickdir(snapdir: number, shift: boolean) {
  switch (snapdir) {
    case 0:
      // left
      user
        .keyboard(!shift ? '[ArrowLeft]' : '{Shift>}[ArrowLeft]{/Shift}')
        .catch(noop)
      break
    case 45:
      // left up
      user
        .keyboard(
          !shift
            ? '[ArrowLeft][ArrowUp]'
            : '{Shift>}[ArrowLeft][ArrowUp]{/Shift}',
        )
        .catch(noop)
      break
    case 90:
      // up
      user
        .keyboard(!shift ? '[ArrowUp]' : '{Shift>}[ArrowUp]{/Shift}')
        .catch(noop)
      break
    case 135:
      // up right
      user
        .keyboard(
          !shift
            ? '[ArrowRight][ArrowUp]'
            : '{Shift>}[ArrowRight][ArrowUp]{/Shift}',
        )
        .catch(noop)
      break
    case 180:
      // right
      user
        .keyboard(!shift ? '[ArrowRight]' : '{Shift>}[ArrowRight]{/Shift}')
        .catch(noop)
      break
    case 225:
      // right down
      user
        .keyboard(
          !shift
            ? '[ArrowRight][ArrowDown]'
            : '{Shift>}[ArrowRight][ArrowDown]{/Shift}',
        )
        .catch(noop)
      break
    case 270:
      // down
      user
        .keyboard(!shift ? '[ArrowDown]' : '{Shift>}[ArrowDown]{/Shift}')
        .catch(noop)
      break
    case 315:
      // down left
      user
        .keyboard(
          !shift
            ? '[ArrowLeft][ArrowDown]'
            : '{Shift>}[ArrowLeft][ArrowDown]{/Shift}',
        )
        .catch(noop)
      break
    case 360:
      // left
      user
        .keyboard(!shift ? '[ArrowLeft]' : '{Shift>}[ArrowLeft]{/Shift}')
        .catch(noop)
      break
  }
}
