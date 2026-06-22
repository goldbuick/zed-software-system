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

import { compilezztoop } from 'zss/feature/zztoop/compile'
import {
  LANG_ZZTOOP_DIR,
  LANG_ZZTOOP_MANIFEST_PATH,
} from 'ops/lib/fixturepaths'

type Manifest = { raw: string[] }

const manifest = JSON.parse(
  readFileSync(LANG_ZZTOOP_MANIFEST_PATH, 'utf8'),
) as Manifest

// LANGREF command coverage: every vanilla command should compile through the
// shared lang transformer + generator without throwing.
const LANGREF_SMOKES = [
  '#cycle 3\n',
  '#go n\n',
  '#walk s\n',
  '#try w :blocked\n',
  '#shoot e\n',
  '#throwstar n\n',
  '#give gems 5\n',
  '#take health 10 :dead\n',
  '#set flag\n',
  '#clear flag\n',
  '#if alligned #shoot e\n',
  '#if contact #die\n',
  '#change blue bear red lion\n',
  '#become passage\n',
  '#put n boulder\n',
  '#send other:start\n',
  '#zap touch\n',
  '#restore touch\n',
  '#lock\n#unlock\n',
  '#play tcd#e+f\n',
  '#endgame\n',
  '#restart\n',
  '#idle\n',
  '#die\n',
  '#end\n',
]

describe('zztoop compiles vanilla fixtures through the shared generator', () => {
  for (const id of manifest.raw) {
    it(`compiles raw/${id}.zss`, () => {
      const source = readFileSync(
        path.join(LANG_ZZTOOP_DIR, 'raw', `${id}.zss`),
        'utf8',
      )
      const build = compilezztoop(id, source)
      expect(build.errors ?? []).toEqual([])
      expect(build.code).toBeDefined()
    })
  }
})

describe('zztoop compiles LANGREF command smokes', () => {
  for (const src of LANGREF_SMOKES) {
    it(`compiles: ${JSON.stringify(src)}`, () => {
      const build = compilezztoop('smoke', src)
      expect(build.errors ?? []).toEqual([])
      expect(build.source).toBeDefined()
    })
  }
})
