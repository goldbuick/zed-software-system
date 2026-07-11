import { createmessage } from 'zss/device'
import {
  shouldforwardclienttowanix,
  shouldforwardwanixtoclient,
} from 'zss/device/forward'

describe('forward wanix', () => {
  it('shouldforwardwanixtoclient is true', () => {
    expect(shouldforwardwanixtoclient()).toBe(true)
  })

  it('forwards second and ready', () => {
    expect(
      shouldforwardclienttowanix(createmessage('s', 'p', 'x', 'second')),
    ).toBe(true)
    expect(
      shouldforwardclienttowanix(createmessage('s', 'p', 'x', 'ready')),
    ).toBe(true)
  })

  it('forwards wanix targets', () => {
    expect(
      shouldforwardclienttowanix(createmessage('s', 'p', 'x', 'wanix:ping')),
    ).toBe(true)
    expect(
      shouldforwardclienttowanix(createmessage('s', 'p', 'x', 'wanix:applyroom')),
    ).toBe(true)
  })

  it('forwards once-device wanix replies', () => {
    expect(
      shouldforwardclienttowanix(
        createmessage('s', 'p', 'x', 'abc123:wanix:ping'),
      ),
    ).toBe(true)
    expect(
      shouldforwardclienttowanix(
        createmessage('s', 'p', 'x', 'abc123:wanix:requestzedcafestate'),
      ),
    ).toBe(true)
  })

  it('does not forward ticktock', () => {
    expect(
      shouldforwardclienttowanix(createmessage('s', 'p', 'x', 'ticktock')),
    ).toBe(false)
  })

  it('does not forward unrelated targets', () => {
    expect(
      shouldforwardclienttowanix(createmessage('s', 'p', 'x', 'register:log')),
    ).toBe(false)
  })

  it('does not forward register wanix cells/session to iframe', () => {
    expect(
      shouldforwardclienttowanix(
        createmessage('s', '', 'x', 'register:wanix:cells'),
      ),
    ).toBe(false)
    expect(
      shouldforwardclienttowanix(
        createmessage('s', '', 'x', 'register:wanix:session'),
      ),
    ).toBe(false)
  })
})
