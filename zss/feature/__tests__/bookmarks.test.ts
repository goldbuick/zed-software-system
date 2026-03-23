import {
  BOOKMARK_TERMINAL_RUNIT_LABEL,
  bookmarkquotedrunitpayload,
  terminalbookmarkpindisplaylabel,
  terminalbookmarkresolvecli,
} from 'zss/feature/terminalbookmarkline'

describe('terminalbookmarkresolvecli', () => {
  it('collapses renderrow double-bang to single for bang+semicolon lines', () => {
    expect(
      terminalbookmarkresolvecli('!!hyperlink refscroll topic;$GREENlabel'),
    ).toBe('!hyperlink refscroll topic;$GREENlabel')
  })

  it('passes through already single-bang hyperlink lines', () => {
    expect(
      terminalbookmarkresolvecli('!hyperlink refscroll topic;$GREENlabel'),
    ).toBe('!hyperlink refscroll topic;$GREENlabel')
  })

  it('normalizes runit and hk style tape rows', () => {
    expect(terminalbookmarkresolvecli('!!runit #pages;$CYANpages')).toBe(
      '!runit #pages;$CYANpages',
    )
    expect(terminalbookmarkresolvecli('!!hk runbookmark id;$label')).toBe(
      '!hk runbookmark id;$label',
    )
  })

  it('wraps plain text in quoted runit with fixed label', () => {
    expect(terminalbookmarkresolvecli('hello world')).toBe(
      `!runit ${bookmarkquotedrunitpayload('hello world')};${BOOKMARK_TERMINAL_RUNIT_LABEL}`,
    )
  })

  it('escapes quotes and backslashes in runit fallback', () => {
    const s = 'say "hi" \\'
    expect(terminalbookmarkresolvecli(s)).toBe(
      `!runit ${bookmarkquotedrunitpayload(s)};${BOOKMARK_TERMINAL_RUNIT_LABEL}`,
    )
  })

  it('wraps #cli lines in runit fallback', () => {
    expect(terminalbookmarkresolvecli('#help')).toBe(
      `!runit ${bookmarkquotedrunitpayload('#help')};${BOOKMARK_TERMINAL_RUNIT_LABEL}`,
    )
  })

  it('does not slice when !! without semicolon', () => {
    expect(terminalbookmarkresolvecli('!!nosemi')).toBe(
      `!runit ${bookmarkquotedrunitpayload('!!nosemi')};${BOOKMARK_TERMINAL_RUNIT_LABEL}`,
    )
  })

  it('is idempotent on resolved bang lines', () => {
    const once = terminalbookmarkresolvecli('!!foo;$bar')
    expect(terminalbookmarkresolvecli(once)).toBe(once)
  })
})

describe('terminalbookmarkpindisplaylabel', () => {
  it('shows right-hand label after semicolon for bang lines', () => {
    expect(
      terminalbookmarkpindisplaylabel('!hyperlink chip x;$GREENmy title'),
    ).toBe('$GREENmy title')
  })

  it('shows unquoted runit payload when label is Bookmark', () => {
    const cli = terminalbookmarkresolvecli('#pages')
    expect(cli.startsWith('!runit ')).toBe(true)
    expect(terminalbookmarkpindisplaylabel(cli)).toBe('#pages')
  })
})
