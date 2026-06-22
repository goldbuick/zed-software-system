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

import { compilezztoop } from 'zss/feature/zztoop/compile'

function emit(src: string): string {
  const build = compilezztoop('test', src)
  expect(build.errors ?? []).toEqual([])
  expect(build.source).toBeDefined()
  return build.source ?? ''
}

function countmatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

describe('zztoop emission', () => {
  it('emits generic commands as api.command(name, ...args)', () => {
    const code = emit('#give health 10\n')
    expect(code).toContain("api.command('give', 'health', 10)")
  })

  it('emits #change with both tiles', () => {
    const code = emit('#change red lion blue door\n')
    expect(code).toContain(
      "api.command('change', 'red', 'lion', 'blue', 'door')",
    )
  })

  it('emits / as a blocking move and ? as a non-blocking move', () => {
    const code = emit('/n\n?s\n')
    expect(code).toContain("api.command('go', 'n')")
    expect(code).toContain("api.command('go', 's')")
    // blocking move guards with continue
    expect(code).toMatch(/if \(\s*api\.command\('go', 'n'\)\s*\) \{ continue/)
  })

  // ZZT OopReadWord terminates a direction word at the next `/` or `?`, so glued
  // shorthand splits into one move per delimiter (OOP.PAS OopExecute one move
  // per tick; wiki.zzt.org/wiki/Movement: `/`=#go waits, `?`=#try continues).
  it('splits glued ?dir?dir into separate non-blocking moves', () => {
    const code = emit('?north?north?north\n')
    expect(countmatches(code, /api\.command\('go', 'north'\)/g)).toBe(3)
    // ? is non-blocking, so no continue guard
    expect(code).not.toMatch(/if \(\s*api\.command\('go', 'north'\)/)
  })

  it('splits glued /dir/dir into separate blocking moves', () => {
    const code = emit('/n/e/s/w\n')
    for (const dir of ['n', 'e', 's', 'w']) {
      expect(code).toMatch(
        new RegExp(`if \\(\\s*api\\.command\\('go', '${dir}'\\)\\s*\\) \\{ continue`),
      )
    }
  })

  it('emits mixed /n?s as one blocking then one non-blocking move', () => {
    const code = emit('/n?s\n')
    expect(code).toMatch(/if \(\s*api\.command\('go', 'n'\)\s*\) \{ continue/)
    expect(code).toContain("api.command('go', 's')")
    expect(code).not.toMatch(/if \(\s*api\.command\('go', 's'\)/)
  })

  // direction modifiers (cw/ccw/opp/rndp) consume an extra whitespace word and
  // ride along with the move (wiki.zzt.org/wiki/Direction_modifiers).
  it('keeps a direction modifier with its move (?cw n)', () => {
    const code = emit('?cw n\n')
    expect(code).toContain("api.command('go', 'cw', 'n')")
  })

  // glued `?cwn` is NOT a modifier: OopReadWord reads `CWN`, OopParseDirection
  // rejects it. We emit a single move with the bad word (firmware parity), not a
  // split.
  it('does not split glued modifier ?cwn', () => {
    const code = emit('?cwn\n')
    expect(code).toContain("api.command('go', 'cwn')")
    expect(countmatches(code, /api\.command\('go'/g)).toBe(1)
  })

  it('treats `? n` (space after delimiter) the same as `?n`', () => {
    expect(emit('? n\n')).toContain("api.command('go', 'n')")
    expect(emit('?n\n')).toContain("api.command('go', 'n')")
  })

  it('emits #play with an opaque line tail', () => {
    const code = emit('#play tcc#d\n')
    expect(code).toContain("api.command('play', 'tcc#d')")
  })

  it('emits #if cond then cmd as a guarded branch', () => {
    const code = emit('#if blocked n #send :stuck\n')
    expect(code).toContain("api.if('blocked', 'n')")
    // the consequent command word is `send` (the leading `#` is the command
    // marker, not part of the name) so it hits the real firmware `send` command
    // rather than the unknown-command shortsend fallback.
    expect(code).toContain("api.command('send', ':stuck')")
    // the send only runs when the condition holds
    expect(code).toMatch(/if \(!api\.if\('blocked', 'n'\)\)/)
  })

  // inline `#` after a move: ZZT leaves position on the `#` and runs it on the
  // next tick, identical to writing the command on the following line
  // (OOP.PAS OopExecute; zzt-vs-zss.md `/i#char 53`, `?n#send label`).
  it('splits an inline command after a move (?n#send label)', () => {
    const code = emit('?n#send label\n')
    expect(code).toContain("api.command('go', 'n')")
    expect(code).toContain("api.command('send', 'label')")
  })

  it('splits an inline command after a blocking move (/i#char 53)', () => {
    const code = emit('/i#char 53\n')
    expect(code).toMatch(/if \(\s*api\.command\('go', 'i'\)\s*\) \{ continue/)
    expect(code).toContain("api.command('char', 53)")
  })

  it('splits inline command after chained moves (?n?n#send label)', () => {
    const code = emit('?n?n#send label\n')
    expect(countmatches(code, /api\.command\('go', 'n'\)/g)).toBe(2)
    expect(code).toContain("api.command('send', 'label')")
  })

  it('emits #if not flag with a leading not literal', () => {
    const code = emit('#if not spinning #end\n')
    expect(code).toContain("api.if('not', 'spinning')")
  })

  it('emits labels and comments', () => {
    const code = emit(":touch\n'a note\n#end\n")
    expect(code).toContain("'touch'")
    expect(code).toContain("'a note'")
  })
})
