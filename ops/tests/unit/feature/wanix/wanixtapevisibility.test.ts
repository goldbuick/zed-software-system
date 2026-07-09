import {
  readwanixtapevisible,
  revealwanixtapeifhidden,
} from 'zss/feature/wanix/wanixtapevisibility'
import { useTape } from 'zss/gadget/data/zustandstores'

describe('wanixtapevisibility', () => {
  afterEach(() => {
    useTape.getState().reset()
  })

  it('readwanixtapevisible is true when terminal is open', () => {
    useTape.setState((state) => ({
      terminalmode: 'cli',
      terminal: { ...state.terminal, open: true },
      editor: { ...state.editor, open: false },
    }))
    expect(readwanixtapevisible()).toBe(true)
  })

  it('readwanixtapevisible is true in quick mode', () => {
    useTape.setState({
      terminalmode: 'quick',
      terminal: { ...useTape.getState().terminal, open: false },
    })
    expect(readwanixtapevisible()).toBe(true)
  })

  it('readwanixtapevisible is true when editor is open', () => {
    useTape.setState((state) => ({
      terminalmode: 'cli',
      terminal: { ...state.terminal, open: false },
      editor: { ...state.editor, open: true },
    }))
    expect(readwanixtapevisible()).toBe(true)
  })

  it('readwanixtapevisible is false when tape is closed', () => {
    useTape.setState((state) => ({
      terminalmode: 'cli',
      terminal: { ...state.terminal, open: false },
      editor: { ...state.editor, open: false },
    }))
    expect(readwanixtapevisible()).toBe(false)
  })

  it('revealwanixtapeifhidden opens terminal when hidden', () => {
    useTape.setState((state) => ({
      terminalmode: 'cli',
      terminal: { ...state.terminal, open: false },
      editor: { ...state.editor, open: false },
    }))
    expect(revealwanixtapeifhidden()).toBe(true)
    expect(useTape.getState().terminal.open).toBe(true)
  })

  it('revealwanixtapeifhidden is a no-op when tape is already visible', () => {
    useTape.setState((state) => ({
      terminalmode: 'cli',
      terminal: { ...state.terminal, open: true },
    }))
    expect(revealwanixtapeifhidden()).toBe(false)
    expect(useTape.getState().terminal.open).toBe(true)
  })
})
