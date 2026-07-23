import { terminalinclayout } from 'zss/device/register/helpers/layout'
import {
  resetwanixclientstore,
  useWanixClient,
} from 'zss/device/wanixclient/wanixclientstore'
import {
  applywanixsessionmessage,
  cyclewanixattachlayout,
  cyclewanixattachedsession,
  detachwanixterm,
  onwanixtermsessionopen,
  readattachedsession,
  readwanixactivesession,
  readwanixattachlayout,
  readwanixattachpanelopen,
  reattachwanixterm,
  resetwanixattachforidle,
  resetwanixattachstatefortest,
  setattachedsession,
  setwanixactivesession,
  tryattachwanixsession,
  subscribewanixattach,
} from 'zss/device/wanixclient/wanixdisplay'
import { createidleroomconfig } from 'zss/feature/wanix/wanixroomtypes'
import { WANIX_ZEDSYNC_TASK_ID } from 'zss/feature/wanix/wanixzedcafeconstants'
import { TAPE_DISPLAY, useTape } from 'zss/gadget/data/zustandstores'

jest.mock('zss/feature/durable', () => ({
  durableget: jest.fn(),
  durableset: jest.fn().mockResolvedValue(undefined),
}))

describe('wanixdisplay attach', () => {
  afterEach(() => {
    resetwanixattachstatefortest()
    resetwanixclientstore()
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

  it('session open hard-attaches tasks even when tape is visible', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    applywanixsessionmessage({
      event: 'open',
      sessionkey: 'hello-wasm',
      kind: 'task',
    })
    expect(readattachedsession()).toBe('hello-wasm')
    expect(readwanixattachpanelopen()).toBe(true)
    expect(useTape.getState().terminal.open).toBe(false)
  })

  it('session open hard-attaches tasks after manual detach', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    setattachedsession('task-a')
    detachwanixterm()
    expect(readattachedsession()).toBeNull()
    applywanixsessionmessage({
      event: 'open',
      sessionkey: 'hello-wasm',
      kind: 'task',
    })
    expect(readattachedsession()).toBe('hello-wasm')
    expect(readwanixattachpanelopen()).toBe(true)
    expect(useTape.getState().terminal.open).toBe(false)
  })

  it('session open does not steal attach from sibling tasks', () => {
    setattachedsession('task-a')
    applywanixsessionmessage({
      event: 'open',
      sessionkey: 'task-b',
      kind: 'task',
    })
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixactivesession()).toBe('task-b')
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

  it('reattachwanixterm no-ops when no sessions', () => {
    expect(reattachwanixterm()).toBe(false)
    expect(readattachedsession()).toBeNull()
  })

  it('reattachwanixterm restores last attached session after detach', () => {
    useWanixClient.setState({
      opensessions: new Set(['task-a', 'task-b']),
    })
    setattachedsession('task-b')
    detachwanixterm()
    expect(readattachedsession()).toBeNull()
    expect(reattachwanixterm()).toBe(true)
    expect(readattachedsession()).toBe('task-b')
    expect(readwanixattachpanelopen()).toBe(true)
  })

  it('reattachwanixterm opens panel when soft-attached with tape open', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    useWanixClient.setState({
      opensessions: new Set(['task-a']),
      attachedsessionkey: 'task-a',
      lastattachedsessionkey: 'task-a',
      attachpanelopen: false,
    })
    expect(reattachwanixterm()).toBe(true)
    expect(readattachedsession()).toBe('task-a')
    expect(readwanixattachpanelopen()).toBe(true)
    expect(useTape.getState().terminal.open).toBe(false)
  })

  it('vm session open hard-attaches even when tape is visible', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    applywanixsessionmessage({
      event: 'open',
      sessionkey: 'linux-vm',
      kind: 'vm',
    })
    expect(readattachedsession()).toBe('linux-vm')
    expect(readwanixattachpanelopen()).toBe(true)
    expect(useTape.getState().terminal.open).toBe(false)
  })

  it('vm session open hard-attaches after manual detach', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    onwanixtermsessionopen('task-a')
    detachwanixterm()
    expect(readattachedsession()).toBeNull()
    applywanixsessionmessage({
      event: 'open',
      sessionkey: 'linux-vm',
      kind: 'vm',
    })
    expect(readattachedsession()).toBe('linux-vm')
    expect(readwanixattachpanelopen()).toBe(true)
    expect(useTape.getState().terminal.open).toBe(false)
  })

  it('zedsync session open hard-attaches even when tape is visible', () => {
    useTape.setState((state) => ({
      terminal: { ...state.terminal, open: true },
    }))
    applywanixsessionmessage({
      event: 'open',
      sessionkey: WANIX_ZEDSYNC_TASK_ID,
      kind: 'task',
    })
    expect(readattachedsession()).toBe(WANIX_ZEDSYNC_TASK_ID)
    expect(readwanixattachpanelopen()).toBe(true)
    expect(useTape.getState().terminal.open).toBe(false)
  })

  it('tryattachwanixsession recovers key from room tasks after buffers cleared', () => {
    useWanixClient.setState({
      opensessions: new Set(),
      termbuffers: new Map(),
      roomconfig: {
        ...createidleroomconfig(),
        mode: 'task',
        tasks: [
          {
            id: WANIX_ZEDSYNC_TASK_ID,
            cmd: 'zedsync.wasm zed-workspace',
            running: true,
          },
        ],
      },
    })
    const result = tryattachwanixsession(WANIX_ZEDSYNC_TASK_ID)
    expect(result).toEqual({ ok: true, sessionkey: WANIX_ZEDSYNC_TASK_ID })
    expect(readattachedsession()).toBe(WANIX_ZEDSYNC_TASK_ID)
    expect(readwanixattachpanelopen()).toBe(true)
  })
})
