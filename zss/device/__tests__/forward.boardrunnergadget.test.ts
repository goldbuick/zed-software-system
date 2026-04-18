import { createmessage } from 'zss/device'
import { MESSAGE } from 'zss/device/api'
import {
  shouldforwardboardrunnertoclient,
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

  it('forwards gadgetclient:paint from client peer to server so a joiner-owned board can paint the host operator', () => {
    const m = msg('gadgetclient:paint')
    expect(shouldforwardclienttoserver(m)).toBe(true)
  })

  it('forwards gadgetclient:patch from client peer to server', () => {
    const m = msg('gadgetclient:patch')
    expect(shouldforwardclienttoserver(m)).toBe(true)
  })

  it('forwards boardrunner:ownedboards from server to client (so the worker receives it)', () => {
    const m = msg('boardrunner:ownedboards')
    expect(shouldforwardservertoclient(m)).toBe(true)
  })

  it('forwards boardrunner:gadgetscrollpush from server to client then into the boardrunner worker', () => {
    const m = msg('boardrunner:gadgetscrollpush')
    expect(shouldforwardservertoclient(m)).toBe(true)
    expect(shouldforwardclienttoboardrunner(m)).toBe(true)
  })

  it('forwards jsonsyncserver:clientpatch from boardrunner worker to main, then on to sim', () => {
    const m = msg('jsonsyncserver:clientpatch')
    expect(shouldforwardboardrunnertoclient(m)).toBe(true)
    expect(shouldforwardclienttoserver(m)).toBe(true)
  })

  it('forwards jsonsyncserver:needsnapshot from boardrunner worker to main, then on to sim', () => {
    const m = msg('jsonsyncserver:needsnapshot')
    expect(shouldforwardboardrunnertoclient(m)).toBe(true)
    expect(shouldforwardclienttoserver(m)).toBe(true)
  })

  it('still forwards jsonsyncclient:serverpatch from server into the boardrunner worker', () => {
    const m = msg('jsonsyncclient:serverpatch')
    expect(shouldforwardservertoclient(m)).toBe(true)
    expect(shouldforwardclienttoboardrunner(m)).toBe(true)
  })
})
