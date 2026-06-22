import {
  readwanixattached,
  readwanixattachedkind,
  readwanixtask,
  readwanixvm,
  setwanixtermrouting,
} from 'zss/feature/wanix/wanixsession'
import { wanixtermscreenreset } from 'zss/feature/wanix/wanixtermscreen'

type TapeStore = typeof import('zss/gadget/data/zustandstores').useTape

let tapestore: TapeStore | undefined

async function readtapestore(): Promise<TapeStore> {
  tapestore ??= (await import('zss/gadget/data/zustandstores')).useTape
  return tapestore
}

function readtapestoresync(): TapeStore | undefined {
  return tapestore
}

export async function enterwanixattachedterminal() {
  wanixtermscreenreset()
  const useTape = await readtapestore()
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
  const useTape = readtapestoresync()
  useTape?.setState({ terminalmode: 'cli' })
}

export function readterminalmodeattached() {
  const useTape = readtapestoresync()
  return useTape?.getState().terminalmode === 'attached'
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
    void enterwanixattachedterminal()
  }
}
