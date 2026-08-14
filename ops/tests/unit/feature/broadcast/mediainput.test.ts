import {
  parsemediastartpayload,
} from 'zss/feature/broadcast/mediainput'
import {
  BROWSER_WHEP_ENDPOINT,
  resolvewhependpoint,
} from 'zss/feature/broadcast/mediainputaliases'

describe('resolvewhependpoint', () => {
  it('maps browser alias to local sidecar whep url', () => {
    expect(resolvewhependpoint('browser')).toBe(BROWSER_WHEP_ENDPOINT)
    expect(resolvewhependpoint('BROWSER')).toBe(BROWSER_WHEP_ENDPOINT)
  })

  it('passes through https urls', () => {
    expect(resolvewhependpoint('https://media.example/whep')).toBe(
      'https://media.example/whep',
    )
  })
})

describe('parsemediastartpayload', () => {
  it('accepts whep alias and optional bearer', () => {
    expect(
      parsemediastartpayload({
        kind: 'whep',
        endpoint: 'browser',
        bearer: 'tok',
      }),
    ).toEqual({
      kind: 'whep',
      endpoint: BROWSER_WHEP_ENDPOINT,
      bearer: 'tok',
    })
    expect(
      parsemediastartpayload({
        kind: 'whep',
        endpoint: 'https://whep.test/play',
      }),
    ).toEqual({
      kind: 'whep',
      endpoint: 'https://whep.test/play',
      bearer: '',
    })
  })

  it('rejects outbound broadcast payloads', () => {
    expect(
      parsemediastartpayload({ kind: 'whip', endpoint: 'x', bearer: 'y' }),
    ).toBeUndefined()
  })
})
