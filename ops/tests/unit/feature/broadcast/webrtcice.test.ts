import {
  parseiceserversfromlink,
  resolvelocation,
} from 'zss/feature/broadcast/webrtcice'

describe('parseiceserversfromlink', () => {
  it('returns empty for missing header', () => {
    expect(parseiceserversfromlink(null)).toEqual([])
  })

  it('parses ice-server link urls and credentials', () => {
    const header =
      '<stun:stun.example>; rel="ice-server", ' +
      '<turn:turn.example>; rel="ice-server"; username="u"; credential="p"'
    expect(parseiceserversfromlink(header)).toEqual([
      { urls: 'stun:stun.example' },
      { urls: 'turn:turn.example', username: 'u', credential: 'p' },
    ])
  })
})

describe('resolvelocation', () => {
  it('resolves relative location against the request url', () => {
    expect(resolvelocation('https://127.0.0.1:8890/whep', '/whep/session')).toBe(
      'https://127.0.0.1:8890/whep/session',
    )
  })
})
