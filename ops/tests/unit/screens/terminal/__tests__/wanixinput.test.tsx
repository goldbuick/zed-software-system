/** @jest-environment jsdom */

const mockterminput = jest.fn()
const mockiswanixtermraw = jest.fn(() => false)
const mockechochar = jest.fn()
const mockecholine = jest.fn()
const mockwanixtermwrite = jest.fn()

jest.mock('zss/gadget/userinput', () => ({
  UserInput: jest.requireActual('zss/gadget/userinput.bridge').UserInput,
}))

jest.mock('zss/feature/wanix/wanixhost', () => ({
  sendwanixterminput: (...args: unknown[]) => mockterminput(...args),
}))

const mockreadwanixattachedkind = jest.fn(() => null as 'task' | 'vm' | null)
const mockterminalmode = jest.fn(() => 'attached')

jest.mock('zss/gadget/data/zustandstores', () => ({
  useTape: (selector: (state: { terminalmode: string }) => unknown) =>
    selector({ terminalmode: mockterminalmode() }),
}))

jest.mock('zss/feature/wanix/wanixsession', () => ({
  iswanixtermraw: () => mockiswanixtermraw(),
  readwanixattachedkind: () => mockreadwanixattachedkind(),
}))

jest.mock('zss/device/register', () => ({
  registerreadplayer: () => 'player1',
}))

jest.mock('zss/device/api', () => ({
  apierror: jest.fn(),
  vmcli: jest.fn(),
  wanixdetach: jest.fn(),
  wanixtermwrite: (...args: unknown[]) => mockwanixtermwrite(...args),
}))

jest.mock('zss/feature/wanix/wanixtermscreen', () => ({
  wanixtermscreenechochar: (...args: unknown[]) => mockechochar(...args),
  wanixtermscreenecholine: (...args: unknown[]) => mockecholine(...args),
  wanixtermscreenshowclihint: jest.fn(),
  wanixtermscreenwritepong: jest.fn(),
}))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

import mitt from 'mitt'
import { type ReactNode, useContext, useLayoutEffect, useState } from 'react'
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { UserInputContext } from 'zss/gadget/userinputcontext'
import { wanixdetach } from 'zss/device/api'
import { WanixTermInput } from 'zss/screens/terminal/wanixinput'

function UserFocusLite({ children }: { children: ReactNode }) {
  const [current] = useState(() => mitt())
  return (
    <UserInputContext.Provider value={current}>
      {children}
    </UserInputContext.Provider>
  )
}

function capturemittref(out: { current: ReturnType<typeof mitt> | null }) {
  return function CaptureMitt() {
    const ctx = useContext(UserInputContext)
    useLayoutEffect(() => {
      out.current = ctx
    })
    return null
  }
}

function keyevent(
  type: 'keydown' | 'keyup',
  init: KeyboardEventInit & { key: string },
) {
  return new KeyboardEvent(type, { bubbles: true, ...init })
}

describe('WanixTermInput vm raw input', () => {
  let container: HTMLDivElement
  let root: Root
  const holder: { current: ReturnType<typeof mitt> | null } = { current: null }

  beforeEach(() => {
    jest.clearAllMocks()
    mockiswanixtermraw.mockReturnValue(false)
    mockterminput.mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    holder.current = null
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function mountinput() {
    const CaptureMitt = capturemittref(holder)
    act(() => {
      root.render(
        <UserFocusLite>
          <CaptureMitt />
          <WanixTermInput />
        </UserFocusLite>,
      )
    })
    expect(holder.current).not.toBeNull()
  }

  function emitkeydown(event: KeyboardEvent) {
    act(() => {
      holder.current!.emit('keydown', event)
    })
  }

  it('sends per-keystroke xterm data when vm attached', () => {
    mockreadwanixattachedkind.mockReturnValue('vm')
    mockiswanixtermraw.mockReturnValue(true)
    mountinput()

    emitkeydown(keyevent('keydown', { key: 'h' }))
    emitkeydown(keyevent('keydown', { key: 'i' }))
    emitkeydown(keyevent('keydown', { key: 'Enter' }))

    expect(mockterminput).toHaveBeenCalledWith('h')
    expect(mockterminput).toHaveBeenCalledWith('i')
    expect(mockterminput).toHaveBeenCalledWith('\r')
    expect(mockechochar).not.toHaveBeenCalled()
    expect(mockecholine).not.toHaveBeenCalled()
  })

  it('ctrl+\\ detaches vm without cli mode', () => {
    mockreadwanixattachedkind.mockReturnValue('vm')
    mockiswanixtermraw.mockReturnValue(true)
    mountinput()

    emitkeydown(
      keyevent('keydown', { key: '\\', ctrlKey: true, code: 'Backslash' }),
    )

    expect(wanixdetach).toHaveBeenCalled()
  })

  it('sends ctrl+c immediately in vm raw mode', () => {
    mockreadwanixattachedkind.mockReturnValue('vm')
    mockiswanixtermraw.mockReturnValue(true)
    mountinput()

    emitkeydown(
      keyevent('keydown', { key: 'c', ctrlKey: true, code: 'KeyC' }),
    )

    expect(mockterminput).toHaveBeenCalledWith('\x03')
  })

  it('sends per-keystroke xterm data when raw and not vm-attached', () => {
    mockiswanixtermraw.mockReturnValue(true)
    mockreadwanixattachedkind.mockReturnValue(null)
    mountinput()

    emitkeydown(keyevent('keydown', { key: 'h' }))
    emitkeydown(keyevent('keydown', { key: 'i' }))
    emitkeydown(keyevent('keydown', { key: 'Enter' }))

    expect(mockterminput).toHaveBeenCalledWith('h')
    expect(mockterminput).toHaveBeenCalledWith('i')
    expect(mockterminput).toHaveBeenCalledWith('\r')
    expect(mockechochar).not.toHaveBeenCalled()
    expect(mockecholine).not.toHaveBeenCalled()
  })

  it('sends ctrl+c as xterm interrupt string in non-vm raw mode', () => {
    mockiswanixtermraw.mockReturnValue(true)
    mockreadwanixattachedkind.mockReturnValue(null)
    mountinput()

    emitkeydown(
      keyevent('keydown', { key: 'c', ctrlKey: true, code: 'KeyC' }),
    )

    expect(mockterminput).toHaveBeenCalledWith('\x03')
  })

  it('forwards vm keystrokes to xterm without local echo', () => {
    mockreadwanixattachedkind.mockReturnValue('vm')
    mockiswanixtermraw.mockReturnValue(true)
    mountinput()

    emitkeydown(keyevent('keydown', { key: 'l' }))

    expect(mockterminput).toHaveBeenCalledWith('l')
    expect(mockechochar).not.toHaveBeenCalled()
  })

  it('uses task line discipline when vm raw mode is off', () => {
    mockterminalmode.mockReturnValue('cli')
    mockiswanixtermraw.mockReturnValue(false)
    mockreadwanixattachedkind.mockReturnValue(null)
    mountinput()

    emitkeydown(keyevent('keydown', { key: 'p' }))
    emitkeydown(keyevent('keydown', { key: 'i' }))
    emitkeydown(keyevent('keydown', { key: 'n' }))
    emitkeydown(keyevent('keydown', { key: 'g' }))
    emitkeydown(keyevent('keydown', { key: 'Enter' }))

    expect(mockecholine).toHaveBeenCalledWith('ping')
    expect(mockwanixtermwrite).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'ping',
    )
    expect(mockterminput).not.toHaveBeenCalled()
  })
})
