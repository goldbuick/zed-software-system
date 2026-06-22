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

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compileparse } from 'zss/feature/zztoop/compileparse'
import {
  LANG_ZZTOOP_DIR,
  LANG_ZZTOOP_MANIFEST_PATH,
} from 'ops/lib/fixturepaths'

type Manifest = { raw: string[] }

const manifest = JSON.parse(
  readFileSync(LANG_ZZTOOP_MANIFEST_PATH, 'utf8'),
) as Manifest

describe('zztoop fixtures parse clean', () => {
  for (const id of manifest.raw) {
    it(`parses raw/${id}.zss`, () => {
      const source = readFileSync(
        path.join(LANG_ZZTOOP_DIR, 'raw', `${id}.zss`),
        'utf8',
      )
      const result = compileparse(source)
      expect(result.errors ?? []).toEqual([])
      expect(result.cst).toBeDefined()
    })
  }
})
