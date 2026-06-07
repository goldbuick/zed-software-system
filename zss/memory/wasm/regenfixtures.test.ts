/**
 * Record TS oracle fixtures for zss_memory C++ parity.
 * Deferred (need render/mock/heavy ops): boardlighting, drawpass, permissions,
 * boardcornerexits, session.boardrunner, synthstate play queue.
 */
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

jest.mock('zss/words/textformat', () => ({
  MaybeFlag: { name: 'MaybeFlag' },
  tokenize: () => ({ errors: [{ message: 'mock' }], tokens: [] }),
}))

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { FORMAT_OBJECT, formatobject } from 'zss/feature/format'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { creategadgetid } from 'zss/mapping/guid'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  memoryboundariesclear,
} from 'zss/memory/boundaries'
import {
  memoryclearbookflags,
  memorycreatebook,
  memoryexportbookasjson,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memorycreatecodepage,
  memoryexportcodepage,
} from 'zss/memory/codepageoperations'
import type { MEMORY_ROOT } from 'zss/memory/session'
import { memoryresetbooks } from 'zss/memory/session'
import { trimmemoryexport } from 'zss/memory/trimexport'
import type { BOOK } from 'zss/memory/types'
import { BOOK_KEYS } from 'zss/memory/types'
import { CATEGORY } from 'zss/words/types'

const FIXTUREDIR = path.join(__dirname, '__fixtures__')

type ExpectMode = 'json' | 'string' | 'bool'

type FixtureStep = {
  op: string
  args?: Record<string, unknown>
  expect: {
    mode: ExpectMode
    json?: unknown
    string?: string
    value?: boolean
  }
}

type MemoryFixture = {
  name: string
  initial: Record<string, unknown>
  steps: FixtureStep[]
}

function writfixture(name: string, fixture: MemoryFixture) {
  writeFileSync(
    path.join(FIXTUREDIR, `${name}.json`),
    `${JSON.stringify(fixture, null, 2)}\n`,
  )
}

function makeroot(partial: Partial<MEMORY_ROOT> = {}): MEMORY_ROOT {
  return {
    halt: false,
    frozen: false,
    topic: '',
    operator: '',
    session: 'sess',
    software: { main: '', temp: '' },
    books: {},
    loaders: {},
    ...partial,
  }
}

function wirebookforimport(book: BOOK): FORMAT_OBJECT {
  const j = memoryexportbookasjson(book)
  const pageswired = book.pages
    .map((p) => memoryexportcodepage(p))
    .filter(ispresent)
  const wired = formatobject({ ...j, pages: pageswired }, BOOK_KEYS, {})
  if (!ispresent(wired)) {
    throw new Error('wirebookforimport failed')
  }
  return wired
}

function regenall() {
  rmSync(FIXTUREDIR, { recursive: true, force: true })
  mkdirSync(FIXTUREDIR, { recursive: true })

  writfixture('boundaries.alloc_optional_id', {
    name: 'boundaries.alloc_optional_id',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'boundary_alloc',
        args: { value: { x: 1 }, id: 'mykey' },
        expect: { mode: 'string', string: 'mykey' },
      },
      {
        op: 'boundary_get',
        args: { id: 'mykey' },
        expect: { mode: 'json', json: { x: 1 } },
      },
    ],
  })

  writfixture('boundaries.alloc_overwrite', {
    name: 'boundaries.alloc_overwrite',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'boundary_alloc',
        args: { value: { first: true }, id: 'same' },
        expect: { mode: 'string', string: 'same' },
      },
      {
        op: 'boundary_alloc',
        args: { value: { second: true }, id: 'same' },
        expect: { mode: 'string', string: 'same' },
      },
      {
        op: 'boundary_get',
        args: { id: 'same' },
        expect: { mode: 'json', json: { second: true } },
      },
    ],
  })

  memoryboundariesclear()
  writfixture('boundaries.alloc_empty_id', {
    name: 'boundaries.alloc_empty_id',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'boundary_alloc_and_get',
        args: { value: { z: 3 }, id: '' },
        expect: { mode: 'json', json: { id_nonempty: true, value: { z: 3 } } },
      },
    ],
  })

  writfixture('trimexport.remove_empty_object', {
    name: 'trimexport.remove_empty_object',
    initial: {},
    steps: [
      {
        op: 'trim_export',
        args: { json: { a: {}, b: 1 } },
        expect: { mode: 'json', json: { b: 1 } },
      },
    ],
  })

  writfixture('trimexport.nested_flags', {
    name: 'trimexport.nested_flags',
    initial: {},
    steps: [
      {
        op: 'trim_export',
        args: { json: { p1: {}, p2: { deaths: 2 } } },
        expect: { mode: 'json', json: { p2: { deaths: 2 } } },
      },
    ],
  })

  const paths: { path: string; value: boolean }[] = [
    { path: '/terrain/0/id', value: false },
    { path: '/terrain/42/x', value: false },
    { path: '/terrain/1/code', value: false },
    { path: '/terrain/id', value: false },
    { path: '/terrain/0/char', value: true },
    { path: '/objects/o1/id', value: true },
    { path: '/objects/o1/x', value: true },
    { path: '/books/b1/timestamp', value: false },
    { path: '/loaders/l1', value: false },
  ]
  writfixture('jsonpipefilter.paths', {
    name: 'jsonpipefilter.paths',
    initial: {},
    steps: paths.map(({ path: pathname, value }) => ({
      op: 'path_should_emit',
      args: { path: pathname },
      expect: { mode: 'bool', value },
    })),
  })

  memoryboundariesclear()
  writfixture('runtimeboundary.clone', {
    name: 'runtimeboundary.clone',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'element_runtime_setup',
        args: {
          src: { x: 1, y: 2, kind: 'wall', char: 219 },
          dest: { x: 3, y: 4, kind: 'wall' },
          runtime: {
            category: CATEGORY.ISTERRAIN,
            kinddata: { id: 'wall', name: 'wall' },
          },
        },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'copy_element_runtime',
        args: {},
        expect: {
          mode: 'json',
          json: {
            dest_runtime_not_src: true,
            dest_category: CATEGORY.ISTERRAIN,
            dest_kinddata_name: 'wall',
            src_category: CATEGORY.ISTERRAIN,
          },
        },
      },
    ],
  })

  const roota = makeroot({ operator: 'p1', session: 'sess' })
  const rootb = makeroot({ operator: 'p2', topic: 't1', session: 'sess' })
  writfixture('rootsync.wire_export', {
    name: 'rootsync.wire_export',
    initial: { root: roota },
    steps: [
      { op: 'root_import', expect: { mode: 'json', json: true } },
      {
        op: 'root_replace',
        args: { root: rootb },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'export_root',
        args: { mode: 'root_wire' },
        expect: {
          mode: 'json',
          json: trimmemoryexport({
            halt: false,
            frozen: false,
            topic: 't1',
            operator: 'p2',
            session: 'sess',
            software: { main: '', temp: '' },
            books: {},
          }),
        },
      },
    ],
  })

  const bookmeta = {
    id: 'b1',
    name: 'main',
    timestamp: 1,
    activelist: [] as string[],
    pages: [] as unknown[],
    flags: {},
  }
  writfixture('rootsync.omit_timestamp', {
    name: 'rootsync.omit_timestamp',
    initial: { root: makeroot({ session: 's', books: { b1: bookmeta } }) },
    steps: [
      { op: 'root_import', expect: { mode: 'json', json: true } },
      {
        op: 'root_wire_diff_empty',
        args: {
          root: makeroot({
            session: 's',
            books: { b1: { ...bookmeta, timestamp: 999 } },
          }),
        },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  writfixture('rootsync.omit_loaders', {
    name: 'rootsync.omit_loaders',
    initial: { root: makeroot({ session: 's', loaders: {} }) },
    steps: [
      { op: 'root_import', expect: { mode: 'json', json: true } },
      {
        op: 'root_wire_diff_empty',
        args: {
          root: makeroot({ session: 's', loaders: { l1: 'code' } }),
        },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  memoryresetbooks([])
  memoryboundariesclear()
  const cp = memorycreatecodepage('@board snapjson\n@exitnorth roomn\n', {
    board: {
      id: 'bid',
      name: 'snapboard',
      terrain: [],
      objects: {},
      exitnorth: 'roomn',
    },
  })
  const book = memorycreatebook([cp])
  const wire = wirebookforimport(book)
  const exported = trimmemoryexport(memoryexportbookasjson(book))

  writfixture('book.wire_roundtrip', {
    name: 'book.wire_roundtrip',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'book_import_wire',
        args: { json: wire },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'book_export_trimmed_json',
        expect: { mode: 'json', json: exported },
      },
      {
        op: 'codepage_runtime_field',
        args: { pageid: cp.id, field: 'exitnorth' },
        expect: { mode: 'json', json: 'roomn' },
      },
    ],
  })

  memoryresetbooks([])
  memoryboundariesclear()
  const book2 = memorycreatebook([])
  const cleared = creategadgetid('cleared-player')
  const kept = creategadgetid('kept-player')
  memorywritebookflag(book2, cleared, 'score', 10 as never)
  memoryclearbookflags(book2, cleared)
  memorywritebookflag(book2, kept, 'deaths', 2 as never)
  memorywritebookflag(book2, kept, 'highscore', 99 as never)
  const trimmedflags = trimmemoryexport(memoryexportbookasjson(book2))

  writfixture('book.flags_trim', {
    name: 'book.flags_trim',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'book_import_wire',
        args: { json: wirebookforimport(book2) },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'book_export_trimmed_json',
        expect: { mode: 'json', json: trimmedflags },
      },
      {
        op: 'book_read_flags',
        args: { owner: kept },
        expect: { mode: 'json', json: { deaths: 2, highscore: 99 } },
      },
    ],
  })

  type BoundaryDoc = { code: string; n: number }
  const a: BoundaryDoc = { code: 'a', n: 1 }
  const b: BoundaryDoc = { code: 'a', n: 2 }
  const producer = createjsonpipe<BoundaryDoc>(
    deepcopy(a),
    memoryrootshouldemitpath,
  )
  const patch = producer.emitdiff(b)
  const consumer = createjsonpipe<BoundaryDoc>(
    deepcopy(a),
    memoryrootshouldemitpath,
  )
  const applied = consumer.applyremote(consumer.applyfullsync(a), patch)

  writfixture('boundaryjsonpipe.patch_roundtrip', {
    name: 'boundaryjsonpipe.patch_roundtrip',
    initial: {},
    steps: [
      {
        op: 'jsonpipe_roundtrip',
        args: { base: a, patch },
        expect: { mode: 'json', json: applied },
      },
    ],
  })

  writfixture('boundaryrouting.collect', {
    name: 'boundaryrouting.collect',
    initial: {},
    steps: [
      {
        op: 'collect_boundary_ids',
        args: {
          book: {
            id: 'bk',
            name: 'main',
            timestamp: 0,
            activelist: [],
            pages: [],
            flags: {
              bd1_synth: 's1',
              bd1_layers: 'l1',
              bd1_tracking: 't1',
            },
          },
          board: {
            id: 'bd1',
            name: 'b',
            terrain: [],
            objects: {},
          },
        },
        expect: {
          mode: 'json',
          json: ['bd1', 'l1', 's1', 't1'],
        },
      },
    ],
  })

  const count = readdirSync(FIXTUREDIR).filter((f) => f.endsWith('.json')).length
  return count
}

describe('memory parity fixture regen', () => {
  it('writes fixture corpus when REGEN_MEMORY_FIXTURES=1', () => {
    if (process.env.REGEN_MEMORY_FIXTURES !== '1') {
      return
    }
    const count = regenall()
    expect(count).toBeGreaterThan(0)
  })
})
