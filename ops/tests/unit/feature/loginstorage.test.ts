import { sanitizeloginflags } from 'zss/feature/loginflags'

describe('sanitizeloginflags', () => {
  it('strips terminal config keys from login flag merge', () => {
    const raw = {
      user: 'Alice',
      crt: 'on',
      gadget: 'off',
      ttsengine: 'piper',
      config_crt: 'on',
      rolebytoken: { tok: 'admin' },
    }
    expect(sanitizeloginflags(raw)).toEqual({
      user: 'Alice',
      rolebytoken: { tok: 'admin' },
    })
  })
})
