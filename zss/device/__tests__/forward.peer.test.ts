import type { MESSAGE } from 'zss/device/api'
import {
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
  it('shouldnotforwardonpeerserver blocks bare clock and netterminal cap', () => {
    expect(shouldnotforwardonpeerserver(msg('ticktock'))).toBe(true)
    expect(shouldnotforwardonpeerserver(msg('ready'))).toBe(true)
    expect(shouldnotforwardonpeerserver(msg('netterminal:cap'))).toBe(true)
    expect(shouldnotforwardonpeerserver(msg('vm:operator'))).toBe(false)
  })

  it('shouldnotforwardonpeerserver blocks namespaced ticktock leaf', () => {
    expect(shouldnotforwardonpeerserver(msg('vm:ticktock'))).toBe(true)
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
