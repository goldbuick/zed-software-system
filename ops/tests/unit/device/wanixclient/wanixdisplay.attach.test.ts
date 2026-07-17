import { terminalinclayout } from 'zss/device/register/helpers/layout'
import {
  cyclewanixattachlayout,
  cyclewanixattachedsession,
  detachwanixterm,
  onwanixtermsessionopen,
  readattachedsession,
  readwanixactivesession,
  readwanixattachlayout,
  readwanixattachpanelopen,
  resetwanixattachforidle,
  resetwanixattachstatefortest,
  setattachedsession,
  setwanixactivesession,
  subscribewanixattach,
} from 'zss/device/wanixclient/wanixdisplay'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'

jest.mock('zss/feature/durable', () => ({
  durableget: jest.fn(),
  durableset: jest.fn().mockResolvedValue(undefined),
}))

describe('wanixdisplay attach', () => {
  afterEach(() => {
    resetwanixattachstatefortest()
    useTape.getState().reset()
  })

  it('starts detached with no active session', () => {
    expect(readattachedsession()).toBeNull()
    expect(readwanixactivesession()).toBeNull()
    expect(readwanixattachpanelopen()).toBe(false)
  })

  it('sets and detaches a session', () => {
    setattachedsession('task-a')
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixattachpanelopen()).toBe(true)
    detachwanixterm()
    expect(readattachedsession()).toBeNull()
    expect(readwanixattachpanelopen()).toBe(false)
  })

  it('notifies subscribers', () => {
    const seen: Array<string | null> = []
    const unsubscribe = subscribewanixattach(() => {
      seen.push(readattachedsession())
    })
    setattachedsession('task-a')
    detachwanixterm()
    unsubscribe()
    expect(seen).toEqual(['task-a', null])
  })

  it('auto-attaches when worker sets active and nothing is attached', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: false },
    }))
    setwanixactivesession('linux-vm')
    expect(readattachedsession()).toBe('linux-vm')
    expect(readwanixactivesession()).toBe('linux-vm')
    expect(readwanixattachpanelopen()).toBe(true)
  })

  it('soft auto-attach does not close an open tape or open the panel', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    setwanixactivesession('linux-vm')
    expect(readattachedsession()).toBe('linux-vm')
    expect(readwanixattachpanelopen()).toBe(false)
    expect(useTape.getState().terminal.open).toBe(true)
  })

  it('does not steal focus when already attached', () => {
    setattachedsession('task-a')
    setwanixactivesession('task-b')
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixactivesession()).toBe('task-b')
  })

  it('does not auto-attach after manual detach', () => {
    setwanixactivesession('task-a')
    detachwanixterm()
    setwanixactivesession('task-b')
    expect(readattachedsession()).toBeNull()
    expect(readwanixattachpanelopen()).toBe(false)
  })

  it('open auto-attaches when not attached', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: false },
    }))
    onwanixtermsessionopen('task-a')
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixactivesession()).toBe('task-a')
    expect(readwanixattachpanelopen()).toBe(true)
  })

  it('open soft-attaches without opening panel when tape is visible', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    onwanixtermsessionopen('task-a')
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixattachpanelopen()).toBe(false)
    expect(useTape.getState().terminal.open).toBe(true)
  })

  it('open does not auto-attach after manual detach when a new session connects', () => {
    onwanixtermsessionopen('task-a')
    detachwanixterm()
    onwanixtermsessionopen('task-b')
    expect(readattachedsession()).toBeNull()
    expect(readwanixactivesession()).toBe('task-b')
    expect(readwanixattachpanelopen()).toBe(false)
  })

  it('open does not steal focus when already attached', () => {
    setattachedsession('task-a')
    onwanixtermsessionopen('task-b')
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixactivesession()).toBe('task-b')
  })

  it('allows auto-attach again after idle reset', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: false },
    }))
    setwanixactivesession('task-a')
    detachwanixterm()
    resetwanixattachforidle()
    setwanixactivesession('task-b')
    expect(readattachedsession()).toBe('task-b')
    expect(readwanixattachpanelopen()).toBe(true)
  })

  it('cyclewanixattachedsession no-ops on empty list', () => {
    cyclewanixattachedsession([], 1)
    expect(readattachedsession()).toBeNull()
  })

  it('cyclewanixattachedsession attaches first when nothing attached', () => {
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
  })

  it('cyclewanixattachedsession attaches last when nothing attached and going back', () => {
    cyclewanixattachedsession(['task-a', 'task-b'], -1)
    expect(readattachedsession()).toBe('task-b')
  })

  it('cyclewanixattachedsession wraps forward', () => {
    setattachedsession('task-b')
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
  })

  it('cyclewanixattachedsession wraps backward', () => {
    setattachedsession('task-a')
    cyclewanixattachedsession(['task-a', 'task-b'], -1)
    expect(readattachedsession()).toBe('task-b')
  })

  it('cyclewanixattachedsession attaches first when current not in list', () => {
    setattachedsession('missing')
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
  })

  it('cyclewanixattachedsession clears userdetached', () => {
    setwanixactivesession('task-a')
    detachwanixterm()
    expect(readattachedsession()).toBeNull()
    cyclewanixattachedsession(['task-a', 'task-b'], 1)
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixattachpanelopen()).toBe(true)
  })

  it('cyclewanixattachlayout is independent of tape layout', () => {
    useTape.setState({
      layout: TAPE_DISPLAY.FULL,
      layoutby: {
        quick: TAPE_DISPLAY.TOP,
        cli: TAPE_DISPLAY.FULL,
        editor: TAPE_DISPLAY.TOP,
      },
    })
    expect(readwanixattachlayout()).toBe(TAPE_DISPLAY.TOP)
    cyclewanixattachlayout(true)
    expect(readwanixattachlayout()).toBe(TAPE_DISPLAY.FULL)
    expect(useTape.getState().layout).toBe(TAPE_DISPLAY.FULL)
    terminalinclayout(true)
    expect(useTape.getState().layout).toBe(TAPE_DISPLAY.BOTTOM)
    expect(readwanixattachlayout()).toBe(TAPE_DISPLAY.FULL)
  })

  it('detach preserves attachlayout', () => {
    cyclewanixattachlayout(true)
    expect(readwanixattachlayout()).toBe(TAPE_DISPLAY.FULL)
    setattachedsession('task-a')
    detachwanixterm()
    expect(readwanixattachlayout()).toBe(TAPE_DISPLAY.FULL)
  })
})
