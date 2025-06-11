import { userEvent } from '@testing-library/user-event'

export const user = userEvent.setup({
  delay: 30,
})

export function withclipboard(): Clipboard {
  // @ts-expect-error working around
  // navigator.clipboard being stubbed out by testing-library
  return window.sysclipboard as Clipboard
}
