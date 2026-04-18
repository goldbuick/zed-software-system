import type { MESSAGE } from 'zss/device/api'
import {
  shouldforwardservertoclient,
  shouldnotforwardonpeerclient,
  shouldnotforwardonpeerserver,
} from 'zss/device/forward'

function msg(target: string, player = ''): MESSAGE {
  return {
    session: 's',
    player,
    id: 'id1',
    sender: 'x',
    target,
  }
}

describe('forward peer leaf guards', () => {
  it('shouldnotforwardonpeerserver allows ticktock; blocks ready and netterminal cap', () => {
    expect(shouldnotforwardonpeerserver(msg('ticktock'))).toBe(false)
    expect(shouldnotforwardonpeerserver(msg('ready'))).toBe(true)
    expect(shouldnotforwardonpeerserver(msg('netterminal:cap'))).toBe(true)
    expect(shouldnotforwardonpeerserver(msg('vm:operator'))).toBe(false)
  })

  it('shouldnotforwardonpeerserver allows namespaced ticktock leaf for host→joiner', () => {
    expect(shouldnotforwardonpeerserver(msg('vm:ticktock'))).toBe(false)
  })

  it('host→joiner gate passes ticktock and second', () => {
    const tick = msg('ticktock')
    const sec = msg('second')
    expect(shouldforwardservertoclient(tick)).toBe(true)
    expect(shouldnotforwardonpeerserver(tick)).toBe(false)
    expect(shouldforwardservertoclient(sec)).toBe(true)
    expect(shouldnotforwardonpeerserver(sec)).toBe(false)
  })

  it('shouldnotforwardonpeerclient blocks tick second ready and cap', () => {
    expect(shouldnotforwardonpeerclient(msg('ticktock'))).toBe(true)
    expect(shouldnotforwardonpeerclient(msg('second'))).toBe(true)
    expect(shouldnotforwardonpeerclient(msg('ready'))).toBe(true)
    expect(shouldnotforwardonpeerclient(msg('netterminal:cap'))).toBe(true)
    expect(shouldnotforwardonpeerclient(msg('vm:operator'))).toBe(false)
  })

  it('shouldnotforwardonpeerclient blocks nested second path', () => {
    expect(shouldnotforwardonpeerclient(msg('modem:second'))).toBe(true)
  })
})
