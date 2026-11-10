import { zztoop } from 'zss/feature/parse/zztoop'

describe('zztoop self:do mapping', () => {
  it('keeps :do and rewrites bare #send do to self:do', () => {
    expect(zztoop(':do\n#send do\n')).toBe(':do\n#send self:do\n')
  })

  it('leaves #send all:do unchanged', () => {
    expect(zztoop('#send all:do\n')).toBe('#send all:do\n')
  })

  it('rewrites #if flag then do to self:do', () => {
    expect(zztoop('#if flag then do\n')).toBe('#if flag then self:do\n')
  })

  it('rewrites trailing bare do without then', () => {
    expect(zztoop('#if flag do\n')).toBe('#if flag self:do\n')
  })

  it('still underscore-escapes other reserved words', () => {
    expect(zztoop(':while\n#send while\n')).toBe(':_while\n#send _while\n')
  })

  it('leaves #do command line alone', () => {
    expect(zztoop('#do\n')).toBe('#do\n')
  })
})
