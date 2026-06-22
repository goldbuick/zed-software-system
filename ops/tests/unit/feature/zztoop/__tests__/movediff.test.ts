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

import { compileast as langcompileast } from 'zss/feature/lang/backend/typescript/ast'
import { transformast } from 'zss/feature/lang/backend/typescript/transformer'
import { compilezztoop } from 'zss/feature/zztoop/compile'

// extract the ordered list of `go` argument strings emitted by either backend,
// e.g. "api.command('go', 'cw', 'n')" -> "'cw', 'n'". Both backends share the
// lang `transformast` MOVE codegen, so a matching sequence proves zztoop lowers
// chained shorthand the same way the independently-built lang parser does.
function gosequence(source: string): string[] {
  const out: string[] = []
  const re = /api\.command\('go'((?:, [^)]*)?)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    out.push(match[1].replace(/^, /, '').trim())
  }
  return out
}

// the ordered list of all `api.<method>(...)` calls, normalized, so we can
// compare move + inline-command lowering across backends.
function apisequence(source: string): string[] {
  const out: string[] = []
  const re = /api\.(command|if)\(([^)]*)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    out.push(`${match[1]}(${match[2].trim()})`)
  }
  return out
}

function zztoopgo(src: string): string[] {
  const build = compilezztoop('test', src)
  expect(build.errors ?? []).toEqual([])
  return gosequence(build.source ?? '')
}

function langgo(src: string): string[] {
  const result = langcompileast(src)
  expect(result.errors ?? []).toEqual([])
  expect(result.ast).toBeDefined()
  const transformed = transformast(result.ast!)
  return gosequence(transformed.code ?? '')
}

function zztoopapi(src: string): string[] {
  const build = compilezztoop('test', src)
  expect(build.errors ?? []).toEqual([])
  return apisequence(build.source ?? '')
}

function langapi(src: string): string[] {
  const result = langcompileast(src)
  expect(result.errors ?? []).toEqual([])
  expect(result.ast).toBeDefined()
  const transformed = transformast(result.ast!)
  return apisequence(transformed.code ?? '')
}

describe('zztoop vs lang movement parity', () => {
  for (const src of ['/n', '?s', '?n?n', '/n/e/s/w', '?cw n']) {
    it(`lowers ${JSON.stringify(src)} to the same go sequence`, () => {
      expect(zztoopgo(`${src}\n`)).toEqual(langgo(`${src}\n`))
    })
  }
})

describe('zztoop vs lang inline-after-move parity', () => {
  for (const src of ['?n#send label', '/i#char 53', '?n?n#send label']) {
    it(`lowers ${JSON.stringify(src)} to the same api sequence`, () => {
      expect(zztoopapi(`${src}\n`)).toEqual(langapi(`${src}\n`))
    })
  }
})
