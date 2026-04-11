import { createfirmware } from 'zss/firmware'

describe('createfirmware command argmeta', () => {
  it('stores and returns optional autocomplete metadata', () => {
    const fw = createfirmware().command('demo', ['help'], () => 0, {
      byposition: [['one', 'two']],
    })
    expect(fw.getcommandargmeta('demo')).toEqual({
      byposition: [['one', 'two']],
    })
    expect(fw.getcommandargmeta('missing')).toBeUndefined()
  })
})
