import {
  buildapireadpeerbody,
  buildpeerjoinlocation,
} from '../../../infra/zns-peer-url.js'

describe('buildpeerjoinlocation', () => {
  it('builds JOIN_ORIGIN join hash Location', () => {
    expect(buildpeerjoinlocation('https://zed.cafe', 'PeerId_99')).toBe(
      'https://zed.cafe/join/#PeerId_99',
    )
  })

  it('strips trailing slashes on JOIN_ORIGIN', () => {
    expect(buildpeerjoinlocation('https://zed.cafe/', 'abc123')).toBe(
      'https://zed.cafe/join/#abc123',
    )
  })
})

describe('buildapireadpeerbody', () => {
  it('returns raw peer id value for /api/read', () => {
    expect(
      buildapireadpeerbody('peer', {
        stored: 'HostPeer_1',
        metadata: { kind: 'peer' },
      }),
    ).toEqual({
      success: true,
      key: 'peer',
      value: 'HostPeer_1',
      metadata: { kind: 'peer' },
    })
  })
})
