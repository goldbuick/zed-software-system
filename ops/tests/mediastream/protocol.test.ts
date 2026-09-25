import {
  ismediastreampeerid,
  withmsprefix,
} from 'zss/feature/mediastream/protocol'
import {
  setmediastreamstreaming,
  readmediastreamstreaming,
} from 'zss/feature/mediastream/active'
import { readbroadcastactive, setbroadcastactive } from 'zss/feature/broadcast/broadcastactive'

describe('mediastream protocol', () => {
  it('detects ms_ peer ids', () => {
    expect(ismediastreampeerid('ms_abc')).toBe(true)
    expect(ismediastreampeerid('MQ_abc')).toBe(false)
    expect(withmsprefix('abc')).toBe('ms_abc')
    expect(withmsprefix('ms_xyz')).toBe('ms_xyz')
  })
})

describe('broadcast exclusivity flags', () => {
  afterEach(() => {
    setmediastreamstreaming(false)
    setbroadcastactive(false)
  })

  it('tracks companion streaming separately from WHIP', () => {
    expect(readmediastreamstreaming()).toBe(false)
    expect(readbroadcastactive()).toBe(false)
    setmediastreamstreaming(true)
    expect(readmediastreamstreaming()).toBe(true)
    expect(readbroadcastactive()).toBe(false)
    setbroadcastactive(true)
    expect(readbroadcastactive()).toBe(true)
  })
})
