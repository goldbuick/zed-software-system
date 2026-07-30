import {
  chatpresenceclear,
  chatpresenceformat,
  chatpresencemarkemit,
  chatpresenceshouldemit,
  chatpresencetouch,
  resetchatpresencefortests,
} from 'zss/device/bridge/chatpresence'
import { CHAT_ROSTER_THROTTLE_MS } from 'zss/device/vm/chatrosterformat'

describe('chatpresence', () => {
  beforeEach(() => {
    resetchatpresencefortests()
  })

  it('touch then format yields name:seconds sorted by recency', () => {
    const now = 5_000_000
    chatpresencetouch('mychannel', 'alice', now - 12_000)
    chatpresencetouch('mychannel', 'bob', now)
    expect(chatpresenceformat('mychannel', now)).toBe(
      ['bob:0', 'alice:12'].join('\n'),
    )
  })

  it('throttle gates shouldemit until markemit advances', () => {
    const t0 = 1_000
    expect(chatpresenceshouldemit('rk', t0)).toBe(true)
    chatpresencemarkemit('rk', t0)
    expect(chatpresenceshouldemit('rk', t0 + CHAT_ROSTER_THROTTLE_MS - 1)).toBe(
      false,
    )
    expect(chatpresenceshouldemit('rk', t0 + CHAT_ROSTER_THROTTLE_MS)).toBe(
      true,
    )
  })

  it('clear empties roster for routekey', () => {
    chatpresencetouch('rk', 'alice', Date.now())
    chatpresenceclear('rk')
    expect(chatpresenceformat('rk', Date.now())).toBe('')
  })

  it('prune drops speakers idle over 3600s', () => {
    const now = 9_000_000
    chatpresencetouch('rk', 'keep', now - 10_000)
    chatpresencetouch('rk', 'drop', now - 3_601_000)
    expect(chatpresenceformat('rk', now)).toBe('keep:10')
  })
})
