/** @jest-environment jsdom */

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

import { useCallback } from 'react'
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { uselinkeditcanceloninactive } from 'zss/screens/linkui/linkeditcancel'
import {
  clearlinkeditingkey,
  readlinkeditingkey,
  setlinkeditingkey,
} from 'zss/screens/linkui/linkediting'

const ADDRESS = 'chip:char'

function CancelHarness({
  active,
  address,
}: {
  active: boolean
  address: string
}) {
  const cancelediting = useCallback(() => {
    if (readlinkeditingkey() !== address) {
      return
    }
    clearlinkeditingkey(address)
  }, [address])
  uselinkeditcanceloninactive(active, cancelediting)
  return null
}

function InvokeHarness({
  striperow,
  oncursor,
  onedit,
}: {
  striperow: number
  oncursor: (index: number) => void
  onedit: () => void
}) {
  const invokeediting = useCallback(() => {
    oncursor(striperow)
    onedit()
  }, [oncursor, onedit, striperow])
  return (
    <button type="button" onClick={invokeediting}>
      invoke
    </button>
  )
}

describe('uselinkeditcanceloninactive', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    clearlinkeditingkey()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    clearlinkeditingkey()
  })

  it('does not clear editingkey when editing starts while inactive', () => {
    act(() => {
      root.render(<CancelHarness active={false} address={ADDRESS} />)
    })

    act(() => {
      setlinkeditingkey(ADDRESS)
    })

    expect(readlinkeditingkey()).toBe(ADDRESS)

    act(() => {
      root.render(<CancelHarness active={false} address={ADDRESS} />)
    })

    expect(readlinkeditingkey()).toBe(ADDRESS)
  })

  it('clears editingkey when active flips to false while editing', () => {
    act(() => {
      root.render(<CancelHarness active={true} address={ADDRESS} />)
    })

    act(() => {
      setlinkeditingkey(ADDRESS)
    })
    expect(readlinkeditingkey()).toBe(ADDRESS)

    act(() => {
      root.render(<CancelHarness active={false} address={ADDRESS} />)
    })

    expect(readlinkeditingkey()).toBe('')
  })
})

describe('invokeediting order', () => {
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

  it('calls setcursor before enterediting', () => {
    const order: string[] = []
    act(() => {
      root.render(
        <InvokeHarness
          striperow={7}
          oncursor={(index) => order.push(`cursor:${index}`)}
          onedit={() => order.push('edit')}
        />,
      )
    })

    act(() => {
      container.querySelector('button')?.click()
    })

    expect(order).toEqual(['cursor:7', 'edit'])
  })
})
