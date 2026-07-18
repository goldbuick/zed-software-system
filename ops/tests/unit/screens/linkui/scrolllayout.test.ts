import {
  clearlinkeditingkey,
  setlinkeditingkey,
} from 'zss/screens/linkui/linkediting'
import { linkexpandrowheight } from 'zss/screens/linkui/linktypes'
import { scrollvisiblewindow } from 'zss/screens/linkui/scrolllayout'
import type { PANEL_ITEM } from 'zss/gadget/data/types'

describe('scrollvisiblewindow', () => {
  afterEach(() => {
    clearlinkeditingkey()
  })

  it('keeps compact rows at height 1', () => {
    const items: PANEL_ITEM[] = [
      'plain',
      ['chip', 'label', 'char', 'charedit'],
    ]
    const win = scrollvisiblewindow(items, 1, 10, '')
    expect(win.rowys).toEqual([0, 1])
    expect(win.selectedrowy).toBe(1)
    expect(win.visible).toHaveLength(2)
  })

  it('includes expanded editor and advances later rowys by rowspan', () => {
    setlinkeditingkey('chip:char')
    const items: PANEL_ITEM[] = [
      'before',
      ['chip', 'char', 'char', 'charedit'],
      'after',
    ]
    const win = scrollvisiblewindow(items, 1, 20, 'chip:char')
    const expandh = linkexpandrowheight('charedit', true)
    expect(expandh).toBeGreaterThan(1)
    expect(win.visible).toHaveLength(3)
    expect(win.visible[1]).toEqual(items[1])
    expect(win.rowys[1]).toBe(1)
    expect(win.rowys[2]).toBe(1 + expandh)
    expect(win.selectedrowy).toBe(1)
  })

  it('keeps editing row in view when many lines sit above it', () => {
    setlinkeditingkey('groups:area:color')
    const above: PANEL_ITEM[] = Array.from(
      { length: 12 },
      (_, i) => `line ${i}`,
    )
    const editor: PANEL_ITEM = [
      'groups:area',
      'set colors:',
      'color',
      'coloredit',
    ]
    const items: PANEL_ITEM[] = [...above, editor, 'after']
    const cursor = above.length
    const win = scrollvisiblewindow(items, cursor, 18, 'groups:area:color')
    const expandh = linkexpandrowheight('coloredit', true)
    expect(expandh).toBeGreaterThan(1)
    expect(win.visible).toContainEqual(editor)
    const editorindex = win.visible.findIndex(
      (item) => item === editor || (Array.isArray(item) && item[3] === 'coloredit'),
    )
    expect(editorindex).toBeGreaterThanOrEqual(0)
    expect(win.selectedrowy).toBe(win.rowys[editorindex])
    if (editorindex + 1 < win.rowys.length) {
      expect(win.rowys[editorindex + 1] - win.rowys[editorindex]).toBe(expandh)
    }
  })
})
