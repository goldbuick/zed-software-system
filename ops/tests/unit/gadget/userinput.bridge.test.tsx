/** @jest-environment jsdom */

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

import mitt from 'mitt'
import type { Emitter } from 'mitt'
import { type ReactNode, useContext, useLayoutEffect, useState } from 'react'
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { UserInputContext } from 'zss/gadget/userinputcontext'
import type { UserInputMods } from 'zss/gadget/userinputtypes'

type InputEmitter = Emitter<Record<string, unknown>>

function UserFocusLite({ children }: { children: ReactNode }) {
  const [current] = useState(() => mitt())
  return (
    <UserInputContext.Provider value={current}>
      {children}
    </UserInputContext.Provider>
  )
}

function capturemittref(out: { current: InputEmitter | null }): () => null {
  return function CaptureMitt() {
    const ctx = useContext(UserInputContext) as InputEmitter
    useLayoutEffect(() => {
      out.current = ctx
    })
    return null
  }
}

describe('UserInput stable mitt bridge', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('invokes the latest handler after parent re-renders with a new function identity', () => {
    const calls: string[] = []
    const holder: { current: InputEmitter | null } = { current: null }
    const CaptureMitt = capturemittref(holder)
    const mods: UserInputMods = { alt: false, ctrl: false, shift: false }

    function Parent({ label }: { label: string }) {
      return (
        <UserFocusLite>
          <CaptureMitt />
          <UserInput OK_BUTTON={() => calls.push(label)} />
        </UserFocusLite>
      )
    }

    act(() => {
      root.render(<Parent label="a" />)
    })

    expect(holder.current).not.toBeNull()
    act(() => {
      holder.current!.emit('OK_BUTTON', mods)
    })
    expect(calls).toEqual(['a'])

    act(() => {
      root.render(<Parent label="b" />)
    })

    act(() => {
      holder.current!.emit('OK_BUTTON', mods)
    })
    expect(calls).toEqual(['a', 'b'])
  })
})
