import { createmessage } from 'zss/device'
import { MESSAGE } from 'zss/device/api'
import {
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoserver,
  shouldforwardservertoclient,
} from 'zss/device/forward'

function msg(target: string, player = 'p1'): MESSAGE {
  return createmessage('sess', player, 'sender_test', target)
}

describe('forward rules for boardrunner gadget routes', () => {
  it('forwards boardrunner:desync from client to boardrunner worker, not to sim', () => {
    const m = msg('boardrunner:desync')
    expect(shouldforwardclienttoserver(m)).toBe(false)
    expect(shouldforwardclienttoboardrunner(m)).toBe(true)
  })

  it('forwards boardrunner:clearscroll from client to boardrunner worker, not to sim', () => {
    const m = msg('boardrunner:clearscroll')
    expect(shouldforwardclienttoserver(m)).toBe(false)
    expect(shouldforwardclienttoboardrunner(m)).toBe(true)
  })

  it('lets sim emit boardrunner:clearscroll to the browser bridge', () => {
    const m = msg('boardrunner:clearscroll')
    expect(shouldforwardservertoclient(m)).toBe(true)
  })

  it('still forwards gadgetclient:patch from server to client', () => {
    const m = msg('gadgetclient:patch')
    expect(shouldforwardservertoclient(m)).toBe(true)
  })
})
