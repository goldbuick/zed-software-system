import userEvent from '@testing-library/user-event'

// trigger user events

const user = userEvent.setup({
  // delay: null,
})

export function handlestickdir(snapdir: number, shift: boolean) {
  console.info({ snapdir, shift })
  switch (snapdir) {
    case 0:
      // left
      user.keyboard(!shift ? '[ArrowLeft]' : '{Shift>}[ArrowLeft]{/Shift}')
      break
    case 45:
      // left up
      user.keyboard(
        !shift
          ? '[ArrowLeft][ArrowUp]'
          : '{Shift>}[ArrowLeft][ArrowUp]{/Shift}',
      )
      break
    case 90:
      // up
      user.keyboard(!shift ? '[ArrowUp]' : '{Shift>}[ArrowUp]{/Shift}')
      break
    case 135:
      // up right
      user.keyboard(
        !shift
          ? '[ArrowRight][ArrowUp]'
          : '{Shift>}[ArrowRight][ArrowUp]{/Shift}',
      )
      break
    case 180:
      // right
      user.keyboard(!shift ? '[ArrowRight]' : '{Shift>}[ArrowRight]{/Shift}')
      break
    case 225:
      // right down
      user.keyboard(
        !shift
          ? '[ArrowRight][ArrowDown]'
          : '{Shift>}[ArrowRight][ArrowDown]{/Shift}',
      )
      break
    case 270:
      // down
      user.keyboard(!shift ? '[ArrowDown]' : '{Shift>}[ArrowDown]{/Shift}')
      break
    case 315:
      // down left
      user.keyboard(
        !shift
          ? '[ArrowLeft][ArrowDown]'
          : '{Shift>}[ArrowLeft][ArrowDown]{/Shift}',
      )
      break
    case 360:
      // left
      user.keyboard(!shift ? '[ArrowLeft]' : '{Shift>}[ArrowLeft]{/Shift}')
      break
  }
}
