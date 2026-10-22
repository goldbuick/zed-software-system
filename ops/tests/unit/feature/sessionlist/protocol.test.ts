import {
  createsessionlisttoken,
  issessionlistmessage,
  issessionlistpeerid,
} from 'zss/feature/sessionlist/protocol'

describe('sessionlist protocol', () => {
  it('mints sl_ tokens that pass the peer id check', () => {
    const token = createsessionlisttoken()
    expect(token.startsWith('sl_')).toBe(true)
    expect(issessionlistpeerid(token)).toBe(true)
    expect(createsessionlisttoken()).not.toBe(token)
  })

  it('rejects legacy and malformed tokens', () => {
    expect(issessionlistpeerid('bravekoala1234')).toBe(false)
    expect(issessionlistpeerid('sl_short')).toBe(false)
    expect(issessionlistpeerid('ms_abcdefghij0123456789')).toBe(false)
    expect(issessionlistpeerid(undefined)).toBe(false)
  })

  it('guards messages', () => {
    expect(
      issessionlistmessage({
        type: 'sessionlist:register',
        topic: 'abcd1234',
        players: 2,
      }),
    ).toBe(true)
    expect(
      issessionlistmessage({
        type: 'sessionlist:register',
        topic: '',
        players: 2,
      }),
    ).toBe(false)
    expect(issessionlistmessage({ type: 'sessionlist:query' })).toBe(true)
    expect(issessionlistmessage({ type: 'sessionlist:unregister' })).toBe(true)
    expect(
      issessionlistmessage({
        type: 'sessionlist:list',
        sessions: [{ topic: 'abcd1234', players: 1, updated: 5 }],
      }),
    ).toBe(true)
    expect(
      issessionlistmessage({
        type: 'sessionlist:list',
        sessions: [{ topic: 'abcd1234' }],
      }),
    ).toBe(false)
    expect(issessionlistmessage({ type: 'other' })).toBe(false)
    expect(issessionlistmessage(null)).toBe(false)
  })
})
