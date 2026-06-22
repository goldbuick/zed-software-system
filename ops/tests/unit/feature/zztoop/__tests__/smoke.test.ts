jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  PERF_UI: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
  WASM_SCRIPT: false,
}))

import { compileparse } from 'zss/feature/zztoop/compileparse'
import { tokenize } from 'zss/feature/zztoop/lexer'

describe('zztoop lexer smoke', () => {
  it('classifies the canonical line kinds', () => {
    const names = tokenize('@obj\n:touch\n#end\n/n\n?s\n!msg;go\n)comment\nhello\n')
      .tokens.map((t) => t.tokenType.name)
    expect(names).toContain('zztoop_stat')
    expect(names).toContain('zztoop_label')
    expect(names).toContain('zztoop_command')
    expect(names).toContain('zztoop_divide')
    expect(names).toContain('zztoop_query')
    expect(names).toContain('zztoop_hyperlink')
    expect(names).toContain('zztoop_text')
  })
})

describe('zztoop parse smoke', () => {
  for (const src of [
    '@obj\n#end\n',
    ':touch\n#send :go\n#end\n',
    "'comment line\n#die\n",
    '#change red lion\n',
    '#if blocked n #send :stuck\n',
    '/n\n?s\n',
    '!hi;say hello\n',
    'plain scroll text\n',
    '#play tcc#d\n',
  ]) {
    it(`parses: ${JSON.stringify(src)}`, () => {
      const result = compileparse(src)
      expect(result.errors ?? []).toEqual([])
      expect(result.cst).toBeDefined()
    })
  }
})
