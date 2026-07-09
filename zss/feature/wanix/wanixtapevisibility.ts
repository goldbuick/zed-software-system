import { useTape } from 'zss/gadget/data/zustandstores'

export function readwanixtapevisible(): boolean {
  const { terminalmode, terminal, editor } = useTape.getState()
  return terminalmode === 'quick' || terminal.open || editor.open
}

export function revealwanixtapeifhidden(): boolean {
  if (readwanixtapevisible()) {
    return false
  }
  useTape.setState((state) => ({
    terminal: { ...state.terminal, open: true },
  }))
  return true
}
