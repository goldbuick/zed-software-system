/** @jest-environment jsdom */

const mockwanixattach = jest.fn()

jest.mock('zss/device/register', () => ({
  registerreadplayer: () => 'player1',
}))

jest.mock('zss/device/api', () => ({
  wanixattach: (...args: unknown[]) => mockwanixattach(...args),
}))

jest.mock('zss/gadget/writetext', () => ({
  useWriteText: () => ({
    reset: { bg: 0 },
    active: { bottomedge: 0 },
  }),
}))

jest.mock('zss/words/textformat', () => ({
  tokenizeandwritetextformat: jest.fn(),
}))

jest.mock('zss/screens/tape/common', () => ({
  setuplogitem: jest.fn(),
}))

jest.mock('zss/screens/panel/common', () => ({
  inputcolor: () => '$white',
}))

jest.mock('zss/gadget/userinput', () => ({
  UserInput: jest.requireActual('zss/gadget/userinput.bridge').UserInput,
}))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

import mitt from 'mitt'
import { type ReactNode, useContext, useLayoutEffect, useState } from 'react'
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { UserInputContext } from 'zss/gadget/userinputcontext'
import { TerminalWanixAttach } from 'zss/screens/terminal/wanixlink'

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
    }, [ctx])
    return null
  }
}

describe('TerminalWanixAttach', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('invokes wanixattach with vm id from menu bang link', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root: Root = createRoot(host)
    const mittref = { current: null as ReturnType<typeof mitt> | null }
    const CaptureMitt = capturemittref(mittref)
    act(() => {
      root.render(
        <UserFocusLite>
          <CaptureMitt />
          <TerminalWanixAttach
            active
            prefix=""
            label="Attach linux-vm"
            words={['wanixattach', 'linux-vm']}
            y={0}
          />
        </UserFocusLite>,
      )
    })
    act(() => {
      mittref.current?.emit('OK_BUTTON')
    })
    expect(mockwanixattach).toHaveBeenCalledWith(
      expect.anything(),
      'player1',
      'linux-vm',
    )
    act(() => {
      root.unmount()
    })
    host.remove()
  })
})
