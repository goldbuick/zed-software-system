/** @jest-environment jsdom */

import {
  WANIX_DOM_POPUP_PATH,
  iswanixdompopuppath,
  scrollbodytodomhtml,
} from 'zss/feature/wanix/wanixiframechilddom'
import {
  fillwanixdompopup,
  openwanixdompopup,
  preparewanixdompopup,
} from 'zss/feature/wanix/wanixdompopup'

describe('wanixdompopup', () => {
  it('matches popup vfs path only', () => {
    expect(iswanixdompopuppath(WANIX_DOM_POPUP_PATH)).toBe(true)
    expect(iswanixdompopuppath('#web/dom/style')).toBe(false)
  })

  it('extracts html from scroll body after comments', () => {
    const body = `<!-- tour script -->\n<!doctype html>\n<html></html>`
    expect(scrollbodytodomhtml(body)).toBe('<!doctype html>\n<html></html>')
  })

  it('fills popup document when window is available', () => {
    const write = jest.fn()
    const close = jest.fn()
    const win = {
      closed: false,
      document: { open: jest.fn(), write, close },
    } as unknown as Window

    fillwanixdompopup(win, '<p>hi</p>')
    expect(write).toHaveBeenCalledWith('<p>hi</p>')
    expect(close).toHaveBeenCalled()

    fillwanixdompopup(null, '<p>hi</p>')
  })

  it('openwanixdompopup uses prepared window', () => {
    const write = jest.fn()
    const close = jest.fn()
    const win = {
      closed: false,
      document: { open: jest.fn(), write, close },
    } as unknown as Window

    const originalopen = window.open
    window.open = jest.fn(() => win)

    preparewanixdompopup()
    const opened = openwanixdompopup('<p>tour</p>')

    expect(opened).toBe(win)
    expect(write).toHaveBeenCalledWith('<p>tour</p>')
    window.open = originalopen
  })
})
