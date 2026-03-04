import { createdevice } from 'zss/device'

// a simple singledton device that we use to grab the current session
export const SOFTWARE = createdevice('SOFTWARE')

// CLI mode flag for workers (no window). Set via platform init message.
let _cliMode = false
export function setCliMode(value: boolean) {
  _cliMode = value
}
export function getCliMode(): boolean {
  return _cliMode
}
