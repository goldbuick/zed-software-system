import { useTape } from 'zss/gadget/data/state'
import {
  readwanixattached,
  readwanixattachedkind,
  readwanixtask,
  readwanixvm,
  setwanixtermrouting,
} from 'zss/feature/wanix/wanixsession'
import { wanixtermscreenreset } from 'zss/feature/wanix/wanixtermscreen'

export function enterwanixattachedterminal() {
  wanixtermscreenreset()
  useTape.setState((state) => ({
    terminalmode: 'attached',
    terminal: {
      ...state.terminal,
      open: true,
    },
  }))
  setwanixtermrouting(true)
}

export function leavewanixattachedterminal() {
  setwanixtermrouting(false)
  wanixtermscreenreset()
  useTape.setState({ terminalmode: 'cli' })
}

export function readterminalmodeattached() {
  return useTape.getState().terminalmode === 'attached'
}

export function syncwanixattachedterminalmode() {
  const id = readwanixattached()
  const kind = readwanixattachedkind()
  if (!id || !kind) {
    if (readterminalmodeattached()) {
      leavewanixattachedterminal()
    }
    return
  }
  const exists =
    kind === 'task' ? readwanixtask(id) != null : readwanixvm(id) != null
  if (exists) {
    enterwanixattachedterminal()
  }
}
