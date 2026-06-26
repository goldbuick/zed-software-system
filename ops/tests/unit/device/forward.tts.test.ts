import { createmessage } from 'zss/device'
import {
  shouldforwardclienttotts,
  shouldforwardttstoclient,
} from 'zss/device/forward'

describe('forward tts', () => {
  it('shouldforwardttstoclient is true', () => {
    expect(shouldforwardttstoclient()).toBe(true)
  })

  it('forwards second and ready', () => {
    expect(
      shouldforwardclienttotts(createmessage('s', 'p', 'x', 'second')),
    ).toBe(true)
    expect(
      shouldforwardclienttotts(createmessage('s', 'p', 'x', 'ready')),
    ).toBe(true)
  })

  it('forwards tts targets', () => {
    expect(
      shouldforwardclienttotts(createmessage('s', 'p', 'x', 'tts:info')),
    ).toBe(true)
    expect(
      shouldforwardclienttotts(createmessage('s', 'p', 'x', 'tts:request')),
    ).toBe(true)
  })

  it('does not forward ticktock', () => {
    expect(
      shouldforwardclienttotts(createmessage('s', 'p', 'x', 'ticktock')),
    ).toBe(false)
  })
})
