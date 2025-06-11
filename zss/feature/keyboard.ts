import { userEvent } from '@testing-library/user-event'

export const KEYBOARD_PRESS_DELAY = 32

export const user = userEvent.setup({
  delay: KEYBOARD_PRESS_DELAY,
})

export function withclipboard(): Clipboard {
  // @ts-expect-error working around
  // navigator.clipboard being stubbed out by testing-library
  return window.sysclipboard as Clipboard
}
