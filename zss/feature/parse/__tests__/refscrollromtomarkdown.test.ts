import { refscrollromtomarkdown } from 'zss/feature/parse/refscrollromtomarkdown'

describe('refscrollromtomarkdown', () => {
  it('converts menu-style bang lines to markdown links', () => {
    const src =
      '!helpmenu hk 1 1 next;controls and $greenstart here\n!charscroll hk a A next;char\n'
    const md = refscrollromtomarkdown(src)
    expect(md).toContain(
      '[controls and $greenstart here](<helpmenu hk 1 1 next>)',
    )
    expect(md).toContain('[char](<charscroll hk a A next>)')
  })

  it('converts section and option rows', () => {
    const src = 'section;keyboard input\noption;arrow keys;$greenmove\n'
    const md = refscrollromtomarkdown(src)
    expect(md).toContain('## keyboard input')
    expect(md).toContain('- arrow keys — $greenmove')
  })

  it('unescapes $59 in option fragments', () => {
    const src = 'option;!message$59 Label;\n'
    const md = refscrollromtomarkdown(src)
    expect(md).toContain('- !message; Label')
  })
})
