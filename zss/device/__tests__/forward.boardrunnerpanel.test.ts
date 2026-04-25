import { createmessage } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import {
  shouldforwardclienttoboardrunner,
  shouldforwardclienttoserver,
} from 'zss/device/forward'

describe('forward gates - panel boardrunner targets', () => {
  function msg(target: string): MESSAGE {
    return createmessage('s', 'p1', 'snd', target, ['arg'])
  }

  it('forwards boardrunner:chip:path to boardrunner worker', () => {
    expect(shouldforwardclienttoboardrunner(msg('boardrunner:bookmarkscroll:x'))).toBe(
      true,
    )
  })

  it('still forwards vm:bookmarkscroll to sim server', () => {
    expect(shouldforwardclienttoserver(msg('vm:bookmarkscroll:x'))).toBe(true)
  })

  it('does not send boardrunner: targets to sim server', () => {
    expect(shouldforwardclienttoserver(msg('boardrunner:bookmarkscroll:x'))).toBe(
      false,
    )
  })
})
