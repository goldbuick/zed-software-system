/** @jest-environment jsdom */

import {
  getmobiletextelement,
  onmobiletextinput,
  setmobiletextelement,
} from 'zss/gadget/mobiletext'

describe('mobiletext', () => {
  afterEach(() => {
    setmobiletextelement(null)
  })

  it('defers onmobiletextinput until setmobiletextelement mounts the input', () => {
    const calls: string[] = []
    const unsub = onmobiletextinput((value) => {
      calls.push(value)
    })

    const input = document.createElement('input')
    input.type = 'text'
    setmobiletextelement(input)

    input.value = 'hello'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(calls).toEqual(['hello'])
    unsub()
  })

  it('exposes getmobiletextelement after setmobiletextelement', () => {
    const input = document.createElement('input')
    setmobiletextelement(input)
    expect(getmobiletextelement()).toBe(input)
  })

  it('skips input callback while composing and runs on compositionend', () => {
    const calls: string[] = []
    const input = document.createElement('input')
    setmobiletextelement(input)

    const unsub = onmobiletextinput((value) => {
      calls.push(value)
    })

    input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    input.value = 'x'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(calls).toEqual([])

    input.value = '漢'
    input.dispatchEvent(new Event('compositionend', { bubbles: true }))
    expect(calls).toEqual(['漢'])

    unsub()
  })
})
