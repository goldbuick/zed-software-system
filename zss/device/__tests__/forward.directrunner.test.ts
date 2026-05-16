import { createmessage } from 'zss/device'
import {
  shouldforwardclienttodirectrunner,
  shouldforwardincomingdirecttoboardrunner,
  shouldforwardonpeerclient,
  shouldforwardonpeerserver,
} from 'zss/device/forward'

describe('forward direct runner', () => {
  it('forwards boardrunner:input direct', () => {
    expect(
      shouldforwardclienttodirectrunner(
        createmessage('s', 'p', 'x', 'boardrunner:input'),
      ),
    ).toBe(true)
  })

  it('forwards second and ready for liveness', () => {
    expect(
      shouldforwardclienttodirectrunner(createmessage('s', 'p', 'x', 'second')),
    ).toBe(true)
    expect(
      shouldforwardclienttodirectrunner(createmessage('s', 'p', 'x', 'ready')),
    ).toBe(true)
  })

  it('does not forward boardrunner:tick / patch / paint on the direct path', () => {
    // tick/patch/paint originate on host; runners only receive them via the
    // host hub-and-spoke bridge, never via a join->runner direct channel.
    expect(
      shouldforwardclienttodirectrunner(
        createmessage('s', 'p', 'x', 'boardrunner:tick'),
      ),
    ).toBe(false)
    expect(
      shouldforwardclienttodirectrunner(
        createmessage('s', 'p', 'x', 'boardrunner:patch'),
      ),
    ).toBe(false)
    expect(
      shouldforwardclienttodirectrunner(
        createmessage('s', 'p', 'x', 'boardrunner:paint'),
      ),
    ).toBe(false)
  })

  it('does not forward chip targets on the direct path in v1', () => {
    // v1 plan: only boardrunner:input crosses the direct channel; chip:*
    // joins in phase 2.
    expect(
      shouldforwardclienttodirectrunner(
        createmessage('s', 'p', 'x', 'chip:scroll:label'),
      ),
    ).toBe(false)
  })

  it('does not forward vm:* on the direct path', () => {
    expect(
      shouldforwardclienttodirectrunner(createmessage('s', 'p', 'x', 'vm:cli')),
    ).toBe(false)
    expect(
      shouldforwardclienttodirectrunner(
        createmessage('s', 'p', 'x', 'vm:codewatch'),
      ),
    ).toBe(false)
  })

  it('shouldforwardincomingdirecttoboardrunner mirrors the outbound predicate', () => {
    const cases = [
      'boardrunner:input',
      'boardrunner:tick',
      'chip:scroll:label',
      'vm:cli',
      'second',
      'ready',
    ]
    for (const target of cases) {
      const message = createmessage('s', 'p', 'x', target)
      expect(shouldforwardincomingdirecttoboardrunner(message)).toBe(
        shouldforwardclienttodirectrunner(message),
      )
    }
  })

  it('peer-server bridge refuses direct-tagged messages (defense in depth)', () => {
    const tagged = createmessage('s', 'p', 'x', 'boardrunner:input')
    tagged.direct = true
    expect(shouldforwardonpeerserver(tagged)).toBe(false)
    // untagged message of the same shape still passes the gate
    const untagged = createmessage('s', 'p', 'x', 'boardrunner:input')
    expect(shouldforwardonpeerserver(untagged)).toBe(true)
  })

  it('peer-client bridge refuses direct-tagged messages (defense in depth)', () => {
    const tagged = createmessage('s', 'p', 'x', 'boardrunner:input')
    tagged.direct = true
    expect(shouldforwardonpeerclient(tagged)).toBe(false)
    const untagged = createmessage('s', 'p', 'x', 'boardrunner:input')
    expect(shouldforwardonpeerclient(untagged)).toBe(true)
  })
})
