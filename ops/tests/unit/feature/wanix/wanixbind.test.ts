const ensuremock = jest.fn()
const putmock = jest.fn()

jest.mock('zss/feature/wanix/wanixdompopup', () => ({
  preparewanixdompopup: jest.fn(),
  openwanixdompopup: jest.fn(() => ({}) as Window),
}))

jest.mock('zss/feature/wanix/wanixhost', () => ({
  ensurewanixsandbox: (...args: unknown[]) => ensuremock(...args),
  putwanixfile: (...args: unknown[]) => putmock(...args),
}))

jest.mock('zss/feature/wanix/wanixtermiframehost', () => ({
  readwanixtermiframelayout: () => 'task',
}))

import { openwanixdompopup, preparewanixdompopup } from 'zss/feature/wanix/wanixdompopup'
import { wanixhandlebindscroll } from 'zss/feature/wanix/wanixcommands'

describe('wanixhandlebindscroll', () => {
  const device = { emit: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    ensuremock.mockResolvedValue(undefined)
    putmock.mockResolvedValue(undefined)
  })

  it('writes scroll body to wanix via putwanixfile', async () => {
    await wanixhandlebindscroll(device, 'player1', {
      scrollname: 'notes',
      path: 'scroll-notes.txt',
      text: 'hello world',
    })
    expect(ensuremock).toHaveBeenCalled()
    expect(putmock).toHaveBeenCalledWith(
      'scroll-notes.txt',
      new TextEncoder().encode('hello world'),
    )
    expect(device.emit).toHaveBeenCalledWith(
      'player1',
      'log',
      [expect.stringContaining('wanix bind scroll notes')],
    )
  })

  it('opens popup from scroll body without vfs write', async () => {
    await wanixhandlebindscroll(device, 'player1', {
      scrollname: 'wanixdom',
      path: '#web/dom/popup',
      text: '<!-- x -->\n<!doctype html><html></html>',
    })
    expect(preparewanixdompopup).toHaveBeenCalled()
    expect(openwanixdompopup).toHaveBeenCalledWith(
      '<!doctype html><html></html>',
    )
    expect(ensuremock).not.toHaveBeenCalled()
    expect(putmock).not.toHaveBeenCalled()
  })
})
