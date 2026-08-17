import { createmessage } from 'zss/device'
import {
  shouldforwardclienttoserver,
  shouldforwardonpeerclient,
  shouldforwardonpeerserver,
  shouldforwardservertoclient,
} from 'zss/device/forward'

describe('forward peer predicates', () => {
  it('shouldforwardonpeerserver blocks ready and ticktock', () => {
    expect(
      shouldforwardonpeerserver(createmessage('s', 'p', 'x', 'ready')),
    ).toBe(false)
    expect(
      shouldforwardonpeerserver(createmessage('s', 'p', 'x', 'ticktock')),
    ).toBe(false)
    expect(
      shouldforwardonpeerserver(createmessage('s', 'p', 'x', 'log')),
    ).toBe(true)
  })

  it('shouldforwardonpeerclient blocks ready, second, ticktock', () => {
    expect(
      shouldforwardonpeerclient(createmessage('s', 'p', 'x', 'ready')),
    ).toBe(false)
    expect(
      shouldforwardonpeerclient(createmessage('s', 'p', 'x', 'second')),
    ).toBe(false)
    expect(
      shouldforwardonpeerclient(createmessage('s', 'p', 'x', 'ticktock')),
    ).toBe(false)
  })

  it('shouldforwardservertoclient allows ui and gadget paths', () => {
    expect(
      shouldforwardservertoclient(createmessage('s', 'p', 'x', 'log')),
    ).toBe(true)
    expect(
      shouldforwardservertoclient(
        createmessage('s', 'p', 'x', 'gadgetclient:paint'),
      ),
    ).toBe(true)
    expect(
      shouldforwardservertoclient(createmessage('s', 'p', 'x', 'vm:cli')),
    ).toBe(false)
    expect(
      shouldforwardservertoclient(
        createmessage('s', 'p', 'x', 'netterminal:peerroster'),
      ),
    ).toBe(true)
    expect(
      shouldforwardservertoclient(
        createmessage('s', 'p', 'x', 'register:stickyuser'),
      ),
    ).toBe(true)
  })

  it('shouldforwardservertoclient allows synth audiobytes but not tts paths', () => {
    expect(
      shouldforwardservertoclient(
        createmessage('s', 'p', 'x', 'synth:audiobytes'),
      ),
    ).toBe(true)
    expect(
      shouldforwardservertoclient(createmessage('s', 'p', 'x', 'synth:play')),
    ).toBe(true)
    expect(
      shouldforwardservertoclient(createmessage('s', 'p', 'x', 'synth:tts')),
    ).toBe(false)
    expect(
      shouldforwardservertoclient(
        createmessage('s', 'p', 'x', 'synth:ttsqueue'),
      ),
    ).toBe(false)
  })

  it('shouldforwardclienttoserver allows vm and modem', () => {
    expect(
      shouldforwardclienttoserver(createmessage('s', 'p', 'x', 'vm:cli')),
    ).toBe(true)
    expect(
      shouldforwardclienttoserver(createmessage('s', 'p', 'x', 'modem:sync')),
    ).toBe(true)
  })
})
