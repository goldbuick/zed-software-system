import { striptext } from 'zss/device/bridge/twitchchatstrip'

describe('twitchchatstrip striptext', () => {
  it('preserves https urls after emote strip', () => {
    const text = 'check https://youtu.be/abc123 please'
    expect(
      striptext({
        text,
        emoteOffsets: new Map(),
      }),
    ).toBe(text)
  })

  it('strips emote ranges and keeps surrounding urls', () => {
    // "Kappa hi https://a.example" with Kappa at 0-4
    const text = 'Kappa hi https://a.example'
    expect(
      striptext({
        text,
        emoteOffsets: new Map([['25', ['0-4']]]),
      }),
    ).toBe(' hi https://a.example')
  })
})
