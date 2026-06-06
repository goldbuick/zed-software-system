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
}))

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { compileast } from '../../typescript/ast'
import { transformast } from '../../typescript/transformer'

const FIXTUREDIR = path.join(__dirname, '../__fixtures__/parity')

const FIXTURES: { id: string; source: string }[] = [
  { id: 'empty', source: '' },
  { id: 'if_break', source: '#if 1 break\n' },
  { id: 'while_break', source: '#while 1 break\n' },
  { id: 'repeat_break', source: '#repeat 1 break\n' },
  { id: 'short_go', source: '/somelabel\n' },
  { id: 'short_try', source: '?somelabel\n' },
  { id: 'divide', source: '#if 1 / 2\n' },
  { id: 'paren_multiline', source: '#if ( 1\n+ 2 )\n' },
  { id: 'pick', source: '#if pick a b c\n' },
  { id: 'comparison_chain', source: '#if 1 < 2 < 3\n' },
  { id: 'label_goto', source: ':a\n#go a\n' },
  { id: 'stat_line', source: '@score 10\n' },
  { id: 'text_line', source: 'hello world\n' },
  { id: 'command', source: '#die\n' },
  { id: 'foreach', source: '#foreach x in a b\nbreak\n' },
]

function regenfixtures() {
  mkdirSync(FIXTUREDIR, { recursive: true })

  for (const fixture of FIXTURES) {
    const prefix = path.join(FIXTUREDIR, fixture.id)
    writeFileSync(`${prefix}.zss`, fixture.source, 'utf8')

    const astresult = compileast(fixture.source)
    const diag = {
      errors: astresult.errors ?? [],
      tokencount: astresult.tokens?.length ?? 0,
    }
    writeFileSync(`${prefix}.diag.json`, `${JSON.stringify(diag, null, 2)}\n`)

    if (astresult.errors?.length || !astresult.ast) {
      writeFileSync(`${prefix}.js`, '', 'utf8')
      writeFileSync(`${prefix}.map.json`, '{}\n', 'utf8')
      writeFileSync(`${prefix}.labels.json`, '{}\n', 'utf8')
      continue
    }

    const out = transformast(astresult.ast)
    writeFileSync(`${prefix}.js`, out.code ?? '', 'utf8')
    writeFileSync(`${prefix}.map.json`, `${out.map?.toString() ?? '{}'}\n`)
    writeFileSync(
      `${prefix}.labels.json`,
      `${JSON.stringify(out.labels ?? {}, null, 2)}\n`,
    )
  }

  writeFileSync(
    path.join(FIXTUREDIR, 'manifest.json'),
    `${JSON.stringify(
      FIXTURES.map((f) => f.id),
      null,
      2,
    )}\n`,
  )
}

describe('lang parity fixture regen', () => {
  it('writes fixtures when REGEN_LANG_FIXTURES=1', () => {
    if (process.env.REGEN_LANG_FIXTURES !== '1') {
      return
    }
    regenfixtures()
    expect(FIXTURES.length).toBeGreaterThan(0)
  })
})

describe('lang parity fixtures manifest', () => {
  it('lists every fixture id', () => {
    const manifest = FIXTURES.map((f) => f.id)
    expect(manifest).toContain('if_break')
    expect(manifest).toContain('comparison_chain')
  })
})
