import {
  TWITCH_WHIP_ENDPOINT,
  YOUTUBE_WHIP_ENDPOINT,
  listwhipendpointaliases,
  resolvewhipendpoint,
} from 'zss/feature/broadcast/webbroadcastwhipaliases'
import { DEFAULT_IVS_WHIP_ENDPOINT } from 'zss/feature/broadcast/webbroadcastconstants'
import { parsebroadcaststartpayload } from 'zss/feature/broadcast/webbroadcastclient'

describe('resolvewhipendpoint', () => {
  it('resolves twitch alias', () => {
    expect(resolvewhipendpoint('twitch')).toBe(TWITCH_WHIP_ENDPOINT)
    expect(resolvewhipendpoint('TWITCH')).toBe(TWITCH_WHIP_ENDPOINT)
  })

  it('resolves youtube alias to local WHIP URL', () => {
    expect(resolvewhipendpoint('youtube')).toBe(YOUTUBE_WHIP_ENDPOINT)
    expect(resolvewhipendpoint('YOUTUBE')).toBe(
      'https://127.0.0.1:8889/cafe/whip',
    )
  })

  it('resolves ivs alias', () => {
    expect(resolvewhipendpoint('ivs')).toBe(DEFAULT_IVS_WHIP_ENDPOINT)
    expect(resolvewhipendpoint('ivs-realtime')).toBe(DEFAULT_IVS_WHIP_ENDPOINT)
  })

  it('passes through http URLs', () => {
    const url = 'https://ingress.example/whip/abc'
    expect(resolvewhipendpoint(url)).toBe(url)
  })

  it('returns undefined for unknown alias', () => {
    expect(resolvewhipendpoint('not-a-provider')).toBeUndefined()
  })
})

describe('listwhipendpointaliases', () => {
  it('includes twitch youtube and ivs', () => {
    expect(listwhipendpointaliases()).toEqual(
      expect.arrayContaining(['twitch', 'youtube', 'ivs']),
    )
  })
})

describe('parsebroadcaststartpayload whip aliases', () => {
  it('resolves twitch alias in whip payload', () => {
    expect(
      parsebroadcaststartpayload({
        kind: 'whip',
        endpoint: 'twitch',
        bearer: 'sk_test',
      }),
    ).toEqual({
      kind: 'whip',
      endpoint: TWITCH_WHIP_ENDPOINT,
      bearer: 'sk_test',
    })
  })

  it('resolves youtube alias in whip payload', () => {
    expect(
      parsebroadcaststartpayload({
        kind: 'whip',
        endpoint: 'youtube',
        bearer: 'local-bearer',
      }),
    ).toEqual({
      kind: 'whip',
      endpoint: YOUTUBE_WHIP_ENDPOINT,
      bearer: 'local-bearer',
    })
  })
})
