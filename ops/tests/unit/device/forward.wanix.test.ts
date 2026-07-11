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

  it('forwards wanixserver targets', () => {
    expect(
      shouldforwardclienttowanix(
        createmessage('s', 'p', 'x', 'wanixserver:ping'),
      ),
    ).toBe(true)
    expect(
      shouldforwardclienttowanix(
        createmessage('s', 'p', 'x', 'wanixserver:applyroom'),
      ),
    ).toBe(true)
  })

  it('forwards once-device wanixserver replies', () => {
    expect(
      shouldforwardclienttowanix(
        createmessage('s', 'p', 'x', 'abc123:wanixserver:ping'),
      ),
    ).toBe(true)
    expect(
      shouldforwardclienttowanix(
        createmessage(
          's',
          'p',
          'x',
          'abc123:wanixserver:requestzedcafestate',
        ),
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

  it('does not forward wanixclient cells/session to iframe', () => {
    expect(
      shouldforwardclienttowanix(
        createmessage('s', '', 'x', 'wanixclient:cells'),
      ),
    ).toBe(false)
    expect(
      shouldforwardclienttowanix(
        createmessage('s', '', 'x', 'wanixclient:session'),
      ),
    ).toBe(false)
  })
})
