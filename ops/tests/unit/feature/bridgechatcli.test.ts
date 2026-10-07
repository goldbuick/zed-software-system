import { CHAT_KIND, parsechatstartpayload } from 'zss/device/bridge/chattypes'
import {
  buildchatstartforkind,
  partitionkeyvalwords,
  profilenamefromtoken,
  resolvechatstartwords,
} from 'zss/feature/bridgechatcli'

describe('bridgechatcli', () => {
  it('partitionkeyvalwords splits positional and kv tokens', () => {
    expect(partitionkeyvalwords(['foo', 'channel=bar', 'rk=baz'])).toEqual({
      positional: ['foo'],
      kv: { channel: 'bar', rk: 'baz' },
    })
  })

  it('buildchatstartforkind parses twitch channel from positional args', () => {
    const built = buildchatstartforkind(CHAT_KIND.TWITCH, ['mychannel'])
    expect(built).toEqual({
      kind: CHAT_KIND.TWITCH,
      routekey: 'mychannel',
      channel: 'mychannel',
    })
  })

  it('buildchatstartforkind merges kv overrides for rss', () => {
    const built = buildchatstartforkind(CHAT_KIND.RSS, [
      'rk=feed1',
      'url=https://example.com/rss',
      'poll=90',
    ])
    expect(built).toEqual({
      kind: CHAT_KIND.RSS,
      routekey: 'feed1',
      feedurl: 'https://example.com/rss',
      pollintervalsec: 90,
    })
  })

  it('profilenamefromtoken strips leading @', () => {
    expect(profilenamefromtoken('@myprofile')).toBe('myprofile')
    expect(profilenamefromtoken('plain')).toBeUndefined()
  })

  it('keeps twitchtoken on the shorthand and the start form', () => {
    const shorthand = buildchatstartforkind(CHAT_KIND.TWITCH, [
      'goldbuick',
      'twitchtoken=oauth:abc',
    ])
    const started = buildchatstartforkind(CHAT_KIND.TWITCH, [
      'goldbuick',
      'twitchtoken=abc',
    ])
    expect(shorthand).toEqual({
      kind: CHAT_KIND.TWITCH,
      routekey: 'goldbuick',
      channel: 'goldbuick',
      twitchtoken: 'abc',
    })
    expect(started).toEqual(shorthand)
    expect(shorthand).not.toHaveProperty('clientid')
    expect(shorthand).not.toHaveProperty('mastodontoken')
  })

  it('maps token= to twitchtoken only for a twitch start', () => {
    const twitch = buildchatstartforkind(CHAT_KIND.TWITCH, [
      'goldbuick',
      'token=oauth:abc',
    ])
    expect(twitch?.twitchtoken).toBe('abc')
    expect(twitch?.mastodontoken).toBeUndefined()
    const mastodon = buildchatstartforkind(CHAT_KIND.MASTODON, [
      'feed',
      'https://mastodon.social',
      'someone',
      'token=sekret',
    ])
    expect(mastodon?.mastodontoken).toBe('sekret')
    expect(mastodon?.twitchtoken).toBeUndefined()
  })

  it('parsechatstartpayload keeps a stripped twitchtoken', () => {
    const parsed = parsechatstartpayload({
      kind: 'twitch',
      routekey: 'goldbuick',
      channel: 'goldbuick',
      twitchtoken: 'oauth:abc',
    })
    expect(parsed?.twitchtoken).toBe('abc')
  })

  it('resolvechatstartwords uses saved profile when token is @name', () => {
    const resolved = resolvechatstartwords(
      CHAT_KIND.TWITCH,
      ['@saved'],
      {
        saved: {
          kind: CHAT_KIND.TWITCH,
          routekey: 'savedchan',
          channel: 'savedchan',
        },
      },
    )
    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.payload.channel).toBe('savedchan')
    }
  })
})
