import { parsetargetaspanelchiproute } from 'zss/device/vm/handlers/panelchipdispatch'

describe('parsetargetaspanelchiproute', () => {
  it('parses bookmarkscroll routes', () => {
    expect(parsetargetaspanelchiproute('bookmarkscroll:bookmarkurl')).toEqual({
      target: 'bookmarkscroll',
      path: 'bookmarkurl',
    })
  })

  it('parses editorbookmarkscroll routes', () => {
    expect(
      parsetargetaspanelchiproute('editorbookmarkscroll:snapshotcurrent'),
    ).toEqual({
      target: 'editorbookmarkscroll',
      path: 'snapshotcurrent',
    })
  })

  it('returns undefined for unrelated targets', () => {
    expect(parsetargetaspanelchiproute('inspect:foo')).toBeUndefined()
    expect(parsetargetaspanelchiproute('ownedboard')).toBeUndefined()
  })
})
