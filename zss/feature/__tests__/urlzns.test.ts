import { znsnormalizenamespace, znstenanturl } from 'zss/feature/url'

describe('znsnormalizenamespace', () => {
  it('trims and lowercases namespace labels', () => {
    expect(znsnormalizenamespace(' WiL ')).toBe('wil')
  })
})

describe('znstenanturl', () => {
  it('builds lowercase tenant hostnames', () => {
    expect(znstenanturl('WiL', 'home')).toBe('https://wil.at.zed.cafe/home')
  })
})
