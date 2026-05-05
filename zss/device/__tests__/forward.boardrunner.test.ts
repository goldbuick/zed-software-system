import { createmessage } from 'zss/device'
import {
  shouldforwardboardrunnertoclient,
  shouldforwardclienttoboardrunner,
} from 'zss/device/forward'

describe('forward boardrunner', () => {
  it('shouldforwardboardrunnertoclient is true', () => {
    expect(shouldforwardboardrunnertoclient()).toBe(true)
  })

  it('forwards second and ready', () => {
    expect(
      shouldforwardclienttoboardrunner(createmessage('s', 'p', 'x', 'second')),
    ).toBe(true)
    expect(
      shouldforwardclienttoboardrunner(createmessage('s', 'p', 'x', 'ready')),
    ).toBe(true)
  })

  it('forwards boardrunner targets', () => {
    expect(
      shouldforwardclienttoboardrunner(
        createmessage('s', 'p', 'x', 'boardrunner:ping'),
      ),
    ).toBe(true)
    expect(
      shouldforwardclienttoboardrunner(
        createmessage('s', 'p', 'x', 'boardrunner:paint'),
      ),
    ).toBe(true)
    expect(
      shouldforwardclienttoboardrunner(
        createmessage('s', 'p', 'x', 'boardrunner:patch'),
      ),
    ).toBe(true)
  })

  it('does not forward ticktock', () => {
    expect(
      shouldforwardclienttoboardrunner(
        createmessage('s', 'p', 'x', 'ticktock'),
      ),
    ).toBe(false)
  })
})
