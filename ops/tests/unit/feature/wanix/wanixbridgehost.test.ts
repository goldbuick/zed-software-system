import {
  parsewanixbridgehosturl,
  readwanixbridgeimporturl,
} from 'zss/feature/wanix/wanixbridgehost'

describe('wanixbridgehost url', () => {
  it('parsewanixbridgehosturl requires ws and token', () => {
    expect(() => parsewanixbridgehosturl('')).toThrow(/url required/)
    expect(() => parsewanixbridgehosturl('http://x/')).toThrow(/ws/)
    expect(() =>
      parsewanixbridgehosturl('ws://127.0.0.1:7654/host'),
    ).toThrow(/token/)
    const url = parsewanixbridgehosturl(
      'ws://192.168.1.10:7654/host?token=abc',
    )
    expect(url.hostname).toBe('192.168.1.10')
    expect(url.searchParams.get('token')).toBe('abc')
  })

  it('readwanixbridgeimporturl strips host path for direct ws', () => {
    expect(
      readwanixbridgeimporturl('ws://192.168.1.10:7654/host?token=abc'),
    ).toBe('ws://192.168.1.10:7654/?token=abc')
  })

  it('readwanixbridgeimporturl maps proxy host to proxy import', () => {
    expect(
      readwanixbridgeimporturl(
        'wss://localhost:7777/wanix-bridge-host?token=abc',
      ),
    ).toBe('wss://localhost:7777/wanix-remote-9p/?token=abc')
  })
})
