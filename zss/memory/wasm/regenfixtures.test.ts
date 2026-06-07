/**
 * Record TS oracle fixtures for zss_memory C++ parity.
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

jest.mock('zss/feature/lang/langcompileclient', () => ({
  islangcompileready: () => true,
  compilescript: (_name: string, code: string) => ({
    labels: code.includes(':drawdisplay') ? { drawdisplay: [1] } : {},
  }),
}))

const mockedmemoryreadflags = jest.fn(() => ({}))

jest.mock('zss/memory/flags', () => ({
  memoryreadflags: (...args: unknown[]) => mockedmemoryreadflags(...args),
}))

jest.mock('zss/memory/session', () => {
  const actual =
    jest.requireActual<typeof import('zss/memory/session')>(
      'zss/memory/session',
    )
  return {
    ...actual,
    memoryreadoperator: jest.fn(() => 'operator'),
  }
})

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { FORMAT_OBJECT, formatobject } from 'zss/feature/format'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { CHAR_HEIGHT, CHAR_WIDTH } from 'zss/gadget/data/types'
import {
  createchipid,
  creategadgetid,
  createlayersid,
  createsynthid,
  createtrackingid,
} from 'zss/mapping/guid'
import { deepcopy, ispresent } from 'zss/mapping/types'
import { memorycodehasdrawdisplay } from 'zss/memory/boarddrawdirty'
import {
  memoryboardlightingapplyobject,
  memoryboardlightingmarkplayer,
} from 'zss/memory/boardlighting'
import { memoryreadelementkind } from 'zss/memory/boards'
import { memorytickboard } from 'zss/memory/boardtick'
import {
  memoryclearbookflags,
  memorycreatebook,
  memoryexportbookasjson,
  memorywritebookflag,
} from 'zss/memory/bookoperations'
import {
  memoryboundariesclear,
  memoryboundaryalloc,
  memoryboundaryget,
} from 'zss/memory/boundaries'
import {
  memorycreatecodepage,
  memoryexportcodepage,
} from 'zss/memory/codepageoperations'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import {
  LIGHTING_RAY_TILE_YSCALE,
  lightingmixmaxrange,
  memorylightingaddrangetoblocked,
} from 'zss/memory/lightinggeometry'
import {
  DEFAULT_ALLOWLIST_BY_ROLE,
  memoryallowcommand,
  memoryapplypermissionconfig,
  memorycanruncommand,
  memoryreadallowlistbreakdownbyrole,
  memoryreadallowlistbyrole,
  memoryreadplayertotoken,
  memoryserializepermissions,
  memorysetcommandpermissions,
  memorysetplayertotoken,
  memorysetrolefortoken,
} from 'zss/memory/permissions'
import {
  memoryelementtodisplayprefix,
  memoryelementtologprefix,
  memoryelementtotickerprefix,
} from 'zss/memory/rendering'
import { memorywriteboardelementruntime } from 'zss/memory/runtimeboundary'
import type { MEMORY_ROOT } from 'zss/memory/session'
import { memoryresetbooks } from 'zss/memory/session'
import {
  memorymergesynthvoice,
  memoryqueuesynthplay,
  memoryreadsynth,
  memoryreadsynthplay,
} from 'zss/memory/synthstate'
import { trimformatobject, trimmemoryexport } from 'zss/memory/trimexport'
import type { BOARD, BOARD_ELEMENT, BOOK } from 'zss/memory/types'
import {
  BOARD_SIZE,
  BOARD_WIDTH,
  BOOK_KEYS,
  CODE_PAGE_TYPE,
  CORNER_EXIT_DISPUTED,
} from 'zss/memory/types'
import { CATEGORY, COLLISION, COLOR } from 'zss/words/types'

const FIXTUREDIR = path.join(__dirname, '__fixtures__')

export const FIXTURE_MANIFEST: Record<string, string[]> = {
  'boundaries.test.ts': [
    'boundaries.alloc_optional_id',
    'boundaries.alloc_overwrite',
    'boundaries.alloc_empty_id',
  ],
  'trimexport.test.ts': [
    'trimexport.remove_empty_object',
    'trimexport.nested_flags',
    'trimexport.undefined_keys',
    'trimexport.all_empty',
    'trimformatobject.omit_empty',
    'trimformatobject.nested_flags',
    'trimformatobject.recurse_nested',
  ],
  'rootsync.jsonpipe.test.ts': [
    'jsonpipefilter.paths',
    'rootsync.wire_export',
    'rootsync.omit_timestamp',
    'rootsync.omit_loaders',
    'rootsync.jsonpipe_chain',
  ],
  'runtimeboundary.clone.test.ts': ['runtimeboundary.clone'],
  'bookboundaries.test.ts': [
    'book.wire_roundtrip',
    'book.flags_trim',
    'book.free_nested_runtimes',
    'book.clear_codepage_runtimes',
    'book.gadget_flag_boundary',
  ],
  'boundaryjsonpipe.test.ts': ['boundaryjsonpipe.patch_roundtrip'],
  'boundaryrouting.test.ts': [
    'boundaryrouting.collect',
    'boundaryrouting.player_gadget',
    'boundaryrouting.board_only',
  ],
  'session.simfreeze.test.ts': ['session.frozen_toggle'],
  'session.boardrunner.test.ts': [
    'session.boardrunner_roundtrip',
    'session.assignedboard_roundtrip',
  ],
  'boardwait.test.ts': [
    'boardwait.hydrated_false',
    'boardwait.hydrated_true',
    'boardwait.collect_tick_boundaries',
  ],
  'boardoperations.drawpass.test.ts': [
    'drawpass.draw_before_tick',
    'drawpass.tick_order',
    'drawpass.omit_draw',
    'drawpass.draw_allowids',
    'drawpass.update_dirty_move',
  ],
  'memoryelementtotickerprefix.test.ts': [
    'elementprefix.no_id',
    'elementprefix.displayname',
    'elementprefix.kind_displayname',
    'elementprefix.logical_name',
    'elementprefix.player_user',
    'elementprefix.ticker_vs_log',
  ],
  'boardcornerexits.test.ts': [
    'cornerexit.agree',
    'cornerexit.single_path',
    'cornerexit.disputed',
    'cornerexit.both_fail',
  ],
  'permissions.test.ts': [
    'permissions.controlled',
    'permissions.map_command',
    'permissions.canrun_operator',
    'permissions.canrun_no_token',
    'permissions.canrun_allowlisted',
    'permissions.canrun_deny_allowlist',
    'permissions.admin_role',
    'permissions.lockdown_config',
    'permissions.creative_config',
    'permissions.hydrate_lockdown',
    'permissions.migrate_custom',
    'permissions.keep_overrides',
    'permissions.allow_revoke',
    'permissions.serialize',
    'permissions.roundtrip',
    'permissions.breakdown',
    'permissions.restore_creative',
  ],
  'synthstate.test.ts': [
    'synth.voices_default',
    'synth.merge_restart',
    'synth.merge_persist',
    'synth.playqueue_init',
    'synth.queue_board',
    'synth.queue_global',
    'synth.queue_stop',
  ],
  'lightinggeometry.test.ts': [
    'lighting.yscale',
    'lighting.mixmaxrange_east',
    'lighting.mixmaxrange_vertical',
    'lighting.mixmaxrange_object_narrower',
    'lighting.blocked_partial',
    'lighting.blocked_merge',
    'lighting.blocked_no_merge_partial',
  ],
  'boardlighting.test.ts': [
    'boardlighting.mark_player',
    'boardlighting.radius_one',
    'boardlighting.walkable_range',
    'boardlighting.solid_occlusion',
    'boardlighting.lookup_occlusion',
    'boardlighting.two_blockers',
    'boardlighting.corridor_leak',
  ],
}

type ExpectMode = 'json' | 'string' | 'bool' | 'approx_json'

type FixtureStep = {
  op: string
  args?: Record<string, unknown>
  expect: {
    mode: ExpectMode
    json?: unknown
    string?: string
    value?: boolean
    epsilon?: number
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

function boardindex(x: number, y: number) {
  return x + y * BOARD_WIDTH
}

function maptickrun(run: ReturnType<typeof memorytickboard>) {
  return run.map((item) => ({
    id: item.id,
    type: item.type === CODE_PAGE_TYPE.TERRAIN ? 'terrain' : 'object',
    pass: item.pass ?? 'tick',
    label: item.label ?? '',
    object_id: item.object?.id ?? '',
  }))
}

function boardelementcode(element: BOARD_ELEMENT) {
  const kind = memoryreadelementkind(element)
  return `${kind?.code ?? ''}\n${element.code ?? ''}`
}

function hasdrawcode(element: BOARD_ELEMENT) {
  return memorycodehasdrawdisplay(boardelementcode(element))
}

function collisionlabel(collision: COLLISION | undefined) {
  switch (collision) {
    case COLLISION.ISBULLET:
      return 'ISBULLET'
    case COLLISION.ISSWIM:
      return 'ISSWIM'
    case COLLISION.ISSOLID:
      return 'ISSOLID'
    case COLLISION.ISGHOST:
      return 'ISGHOST'
    default:
      return 'ISWALK'
  }
}

function elementspecsfromboard(board: BOARD) {
  const specs: Record<string, unknown>[] = []
  for (let i = 0; i < board.terrain.length; i++) {
    const terrain = board.terrain[i]
    if (!ispresent(terrain)) {
      continue
    }
    if (hasdrawcode(terrain)) {
      specs.push({
        readid: `${i}`,
        type: 'terrain',
        pass: 'draw',
        has_draw: true,
        object_id: '',
      })
    }
  }
  for (const object of Object.values(board.objects)) {
    if (!object.id) {
      continue
    }
    const hasdraw = hasdrawcode(object)
    if (hasdraw) {
      specs.push({
        readid: object.id,
        type: 'object',
        pass: 'draw',
        has_draw: true,
        object_id: object.id,
        collision: collisionlabel(object.collision),
      })
    }
    specs.push({
      readid: object.id,
      type: 'object',
      pass: 'tick',
      has_draw: hasdraw,
      object_id: object.id,
      collision: collisionlabel(object.collision),
    })
  }
  return specs
}

function drawelementfromboard(board: BOARD) {
  return elementspecsfromboard(board)
}

function cppupdatedrawdirtyexpect(
  board: {
    objects: Record<
      string,
      {
        id: string
        x: number
        y: number
        code?: string
        has_draw?: boolean
      }
    >
  },
  runtime: {
    drawlastfp?: Record<string, string>
    drawlastxy?: Record<string, { x: number; y: number }>
  } = {},
) {
  const oldfp = runtime.drawlastfp ?? {}
  const oldxy = runtime.drawlastxy ?? {}
  const nextfp: Record<string, string> = {}
  const nextxy: Record<string, { x: number; y: number }> = {}
  const seedcells = new Set<number>()
  const allowids = new Set<string>()

  for (const [, obj] of Object.entries(board.objects)) {
    const readid = obj.id
    const ox = obj.x ?? 0
    const oy = obj.y ?? 0
    const fp = `${ox}|${oy}|${obj.code ?? ''}`
    nextfp[readid] = fp
    nextxy[readid] = { x: ox, y: oy }
    if (oldfp[readid] !== undefined && oldfp[readid] !== fp) {
      seedcells.add(boardindex(ox, oy))
      const prev = oldxy[readid]
      if (prev && (prev.x !== ox || prev.y !== oy)) {
        seedcells.add(boardindex(prev.x, prev.y))
      }
    }
    if (obj.has_draw) {
      allowids.add(readid)
    }
  }

  for (const [id, pt] of Object.entries(oldxy)) {
    if (!nextxy[id]) {
      seedcells.add(boardindex(pt.x, pt.y))
    }
  }

  const expanded = new Set<number>()
  for (const idx of seedcells) {
    expanded.add(idx)
    const x = idx % BOARD_WIDTH
    const y = Math.floor(idx / BOARD_WIDTH)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          continue
        }
        const ni = boardindex(x + dx, y + dy)
        if (ni >= 0) {
          expanded.add(ni)
        }
      }
    }
  }

  const drawallowids = [
    ...Array.from(allowids),
    ...Array.from(expanded).map((idx) => `${idx}`),
  ].sort()

  return {
    drawallowids,
    drawlastfp: nextfp,
    drawlastxy: nextxy,
    seed_count: seedcells.size,
  }
}

function maketickboard(
  objects: Record<string, BOARD_ELEMENT>,
  terrain: BOARD_ELEMENT[],
): BOARD {
  return {
    id: 'board_test',
    name: 'board test',
    objects,
    terrain,
    runtime: '',
  }
}

function maketickterrain(x: number, y: number, code: string): BOARD_ELEMENT {
  const terrain: BOARD_ELEMENT = {
    x,
    y,
    kind: 'terrain_kind',
    runtime: '',
  }
  memorywriteboardelementruntime(terrain, {
    kinddata: { id: 'terrain_kind', code, runtime: '' },
  })
  return terrain
}

function maketickobject(
  id: string,
  code: string,
  collision: COLLISION = COLLISION.ISWALK,
): BOARD_ELEMENT {
  const object: BOARD_ELEMENT = {
    id,
    x: 1,
    y: 1,
    collision,
    kind: 'object_kind',
    runtime: '',
  }
  memorywriteboardelementruntime(object, {
    kinddata: { id: 'object_kind', code, runtime: '' },
  })
  return object
}

function baseprefixelement(over: Partial<BOARD_ELEMENT> = {}): BOARD_ELEMENT {
  const element: BOARD_ELEMENT = {
    id: 'oid',
    kind: 'chest',
    name: 'logical',
    char: 2,
    color: COLOR.WHITE,
    bg: COLOR.BLACK,
    runtime: '',
    ...over,
  }
  memorywriteboardelementruntime(element, {
    kinddata: {
      id: 'chest',
      name: 'chest',
    } as BOARD_ELEMENT,
  })
  return element
}

function prefixargs(
  element: BOARD_ELEMENT,
  flags: Record<string, unknown> = {},
  kinddata: Record<string, unknown> = { id: 'chest', name: 'chest' },
) {
  return {
    element,
    flags,
    kinddata,
    displayprefix: memoryelementtodisplayprefix(element),
  }
}

function permissioncanrunexpect(player: string, command: string) {
  const allowed = memorycanruncommand(player, command)
  if (allowed) {
    return { allowed: true, deny_reason: '' }
  }
  const tokens = memoryreadplayertotoken()
  if (!tokens[player]) {
    return { allowed: false, deny_reason: 'no token (deny)' }
  }
  return { allowed: false, deny_reason: '(deny)' }
}

function synthsessionjson() {
  return {
    mainbook: {
      id: 'bk',
      name: 'main',
      timestamp: 0,
      activelist: [],
      pages: [],
      flags: {},
    },
    synthflags: {},
  }
}

function sortedrolefamilies(role: string) {
  const allow = memoryreadallowlistbyrole()[role]
  return Array.from(allow ?? []).sort()
}

function emptyterrainboard(id = 'testboard'): BOARD {
  return {
    id,
    name: 'test',
    terrain: Array.from({ length: BOARD_SIZE }, () => ({ runtime: '' })),
    objects: {},
    runtime: '',
  }
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

  const bookmeta: BOOK = {
    id: 'b1',
    name: 'main',
    timestamp: 1,
    activelist: [],
    pages: [],
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
              [createsynthid('bd1')]: 's1',
              [createlayersid('bd1')]: 'l1',
              [createtrackingid('bd1')]: 't1',
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

  const pid = 'pid_0000_fixtureplayer'
  writfixture('boundaryrouting.player_gadget', {
    name: 'boundaryrouting.player_gadget',
    initial: {},
    steps: [
      {
        op: 'collect_boundary_ids',
        args: {
          book: {
            id: 'bk2',
            name: 'main',
            timestamp: 0,
            activelist: [],
            pages: [],
            flags: {
              [createsynthid('bd2')]: 'sx',
              [pid]: 'pf',
              [creategadgetid(pid)]: 'gf',
            },
          },
          board: {
            id: 'bd2',
            name: 'b',
            terrain: [],
            objects: { [pid]: { id: pid, x: 0, y: 0 } },
          },
        },
        expect: { mode: 'json', json: ['bd2', 'gf', 'pf', 'sx'] },
      },
    ],
  })

  writfixture('boundaryrouting.board_only', {
    name: 'boundaryrouting.board_only',
    initial: {},
    steps: [
      {
        op: 'collect_boundary_ids',
        args: {
          book: {
            id: 'bk3',
            name: 'main',
            timestamp: 0,
            activelist: [],
            pages: [],
            flags: {},
          },
          board: { id: 'bd3', name: 'b', terrain: [], objects: {} },
        },
        expect: { mode: 'json', json: ['bd3'] },
      },
    ],
  })

  writfixture('trimexport.undefined_keys', {
    name: 'trimexport.undefined_keys',
    initial: {},
    steps: [
      {
        op: 'trim_export',
        args: { json: { a: undefined, b: 1 } },
        expect: { mode: 'json', json: { b: 1 } },
      },
    ],
  })

  writfixture('trimexport.all_empty', {
    name: 'trimexport.all_empty',
    initial: {},
    steps: [
      {
        op: 'trim_export',
        args: { json: { a: {}, b: { c: {} } } },
        expect: { mode: 'json', json: null },
      },
    ],
  })

  writfixture('trimformatobject.omit_empty', {
    name: 'trimformatobject.omit_empty',
    initial: {},
    steps: [
      {
        op: 'trim_format_object',
        args: {
          json: ['a', 1, 'b', {}, 'c', null, 'd', 2],
        },
        expect: { mode: 'json', json: ['a', 1, 'd', 2] },
      },
    ],
  })

  writfixture('trimformatobject.nested_flags', {
    name: 'trimformatobject.nested_flags',
    initial: {},
    steps: [
      {
        op: 'trim_format_object',
        args: { json: ['flags', { p1: {}, p2: { deaths: 2 } }] },
        expect: { mode: 'json', json: ['flags', { p2: { deaths: 2 } }] },
      },
    ],
  })

  writfixture('trimformatobject.recurse_nested', {
    name: 'trimformatobject.recurse_nested',
    initial: {},
    steps: [
      {
        op: 'trim_format_object',
        args: { json: ['meta', ['x', {}, 'y', 3], 'id', 'abc'] },
        expect: { mode: 'json', json: ['meta', ['y', 3], 'id', 'abc'] },
      },
    ],
  })

  const r0 = makeroot({ session: 's0' })
  const r1 = makeroot({ session: 's1' })
  const r2 = makeroot({ session: 's2', halt: true })
  const chainproducer = createjsonpipe<MEMORY_ROOT>(deepcopy(r0), () => true)
  const chainp1 = chainproducer.emitdiff(r1)
  const chainp2 = chainproducer.emitdiff(r2)

  writfixture('rootsync.jsonpipe_chain', {
    name: 'rootsync.jsonpipe_chain',
    initial: {},
    steps: [
      {
        op: 'root_jsonpipe_chain',
        args: { base: r0, patches: [chainp1, chainp2] },
        expect: { mode: 'json', json: r2 },
      },
    ],
  })

  writfixture('session.frozen_toggle', {
    name: 'session.frozen_toggle',
    initial: {},
    steps: [
      {
        op: 'session_frozen_set',
        args: { value: false },
        expect: { mode: 'json', json: true },
      },
      { op: 'session_frozen_get', expect: { mode: 'json', json: false } },
      {
        op: 'session_frozen_set',
        args: { value: true },
        expect: { mode: 'json', json: true },
      },
      { op: 'session_frozen_get', expect: { mode: 'json', json: true } },
      {
        op: 'session_frozen_set',
        args: { value: false },
        expect: { mode: 'json', json: true },
      },
      { op: 'session_frozen_get', expect: { mode: 'json', json: false } },
    ],
  })

  writfixture('session.boardrunner_roundtrip', {
    name: 'session.boardrunner_roundtrip',
    initial: {},
    steps: [
      {
        op: 'session_boardrunner_set',
        args: { value: 'p1' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'session_boardrunner_get',
        expect: { mode: 'string', string: 'p1' },
      },
      {
        op: 'session_boardrunner_set',
        args: { value: '' },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  writfixture('session.assignedboard_roundtrip', {
    name: 'session.assignedboard_roundtrip',
    initial: {},
    steps: [
      {
        op: 'session_assignedboard_set',
        args: { value: 'board-a' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'session_assignedboard_get',
        expect: { mode: 'string', string: 'board-a' },
      },
      {
        op: 'session_assignedboard_set',
        args: { value: '' },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  writfixture('boardwait.hydrated_false', {
    name: 'boardwait.hydrated_false',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'boundary_alloc',
        args: { id: 'board-a', value: {} },
        expect: { mode: 'string', string: 'board-a' },
      },
      {
        op: 'board_runtime_hydrated',
        args: { board_id: 'board-a' },
        expect: { mode: 'json', json: false },
      },
    ],
  })

  writfixture('boardwait.hydrated_true', {
    name: 'boardwait.hydrated_true',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'boundary_alloc',
        args: {
          id: 'board-a',
          value: {
            board: { id: 'board-a', name: 'board-a', terrain: [], objects: {} },
          },
        },
        expect: { mode: 'string', string: 'board-a' },
      },
      {
        op: 'board_runtime_hydrated',
        args: { board_id: 'board-a' },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  writfixture('boardwait.collect_tick_boundaries', {
    name: 'boardwait.collect_tick_boundaries',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'boundary_alloc',
        args: { id: 'board-a', value: {} },
        expect: { mode: 'string', string: 'board-a' },
      },
      {
        op: 'boundary_alloc',
        args: {
          id: 'board-b',
          value: {
            board: { id: 'board-b', name: 'board-b', terrain: [], objects: {} },
          },
        },
        expect: { mode: 'string', string: 'board-b' },
      },
      {
        op: 'collect_tick_boundaries',
        args: {
          book: { flags: {} },
          boards: ['board-a', 'board-b'],
        },
        expect: { mode: 'json', json: ['board-b'] },
      },
    ],
  })

  memoryboundariesclear()
  const boardruntimeid = 'board-runtime'
  const terrainruntimeid = 'terrain-runtime'
  const objectruntimeid = 'object-runtime'
  const pageobjectruntimeid = 'page-object-runtime'
  const pageterrainruntimeid = 'page-terrain-runtime'
  memoryboundaryalloc({}, boardruntimeid)
  memoryboundaryalloc({}, terrainruntimeid)
  memoryboundaryalloc({}, objectruntimeid)
  memoryboundaryalloc({}, pageobjectruntimeid)
  memoryboundaryalloc({}, pageterrainruntimeid)
  const freecp = memorycreatecodepage('@board testboard\n', {
    board: {
      id: 'b',
      name: 'board',
      terrain: [{ runtime: terrainruntimeid }],
      objects: { oid: { id: 'oid', runtime: objectruntimeid } },
      runtime: boardruntimeid,
    },
    object: { id: 'obj', runtime: pageobjectruntimeid },
    terrain: { runtime: pageterrainruntimeid },
  })
  const freebook = memorycreatebook([freecp])
  const freeruntimeids = [
    freecp.id,
    boardruntimeid,
    terrainruntimeid,
    objectruntimeid,
    pageobjectruntimeid,
    pageterrainruntimeid,
  ]

  writfixture('book.free_nested_runtimes', {
    name: 'book.free_nested_runtimes',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      ...freeruntimeids.map((id) => ({
        op: 'boundary_alloc',
        args: { id, value: { marker: id } },
        expect: { mode: 'string', string: id },
      })),
      {
        op: 'free_book',
        args: { book: freebook, runtime_ids: freeruntimeids },
        expect: { mode: 'json', json: true },
      },
      ...freeruntimeids.map((id) => ({
        op: 'boundary_get',
        args: { id },
        expect: { mode: 'json', json: {} },
      })),
    ],
  })

  memoryboundariesclear()
  const clearboardruntime = 'board-runtime-clear'
  const clearobjectruntime = 'object-runtime-clear'
  memoryboundaryalloc({}, clearboardruntime)
  memoryboundaryalloc({}, clearobjectruntime)
  const clearcp = memorycreatecodepage('@board clearme\n', {
    board: {
      id: 'b2',
      name: 'board2',
      terrain: [],
      objects: {},
      runtime: clearboardruntime,
    },
    object: { id: 'obj2', runtime: clearobjectruntime },
  })
  const clearbook = memorycreatebook([clearcp])
  const clearids = [clearcp.id, clearboardruntime, clearobjectruntime]

  writfixture('book.clear_codepage_runtimes', {
    name: 'book.clear_codepage_runtimes',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      ...clearids.map((id) => ({
        op: 'boundary_alloc',
        args: { id, value: { marker: id } },
        expect: { mode: 'string', string: id },
      })),
      {
        op: 'clear_codepage',
        args: { pageid: clearcp.id, runtime_ids: clearids },
        expect: { mode: 'json', json: true },
      },
      ...clearids.map((id) => ({
        op: 'boundary_get',
        args: { id },
        expect: { mode: 'json', json: {} },
      })),
    ],
  })

  const gadgetowner = creategadgetid('testplayer')
  const gadgetbook = memorycreatebook([])
  memorywritebookflag(gadgetbook, gadgetowner, 'x', 42 as never)

  writfixture('book.gadget_flag_boundary', {
    name: 'book.gadget_flag_boundary',
    initial: {},
    steps: [
      { op: 'boundaries_clear', expect: { mode: 'json', json: true } },
      {
        op: 'book_import_wire',
        args: { json: wirebookforimport(gadgetbook) },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'book_read_flags',
        args: { owner: gadgetowner },
        expect: { mode: 'json', json: { x: 42 } },
      },
    ],
  })

  memoryboundariesclear()
  const drawterrain = new Array<BOARD_ELEMENT>(BOARD_SIZE)
  drawterrain[0] = maketickterrain(0, 0, ':drawdisplay\n#end')
  const objectdraw = maketickobject('sid_draw', ':drawdisplay\n#end')
  const objecttick = maketickobject('sid_tick', ':tick\n#end')
  const drawboard = maketickboard(
    { [objectdraw.id ?? '']: objectdraw, [objecttick.id ?? '']: objecttick },
    drawterrain,
  )

  writfixture('drawpass.draw_before_tick', {
    name: 'drawpass.draw_before_tick',
    initial: {},
    steps: [
      {
        op: 'tick_board',
        args: {
          board: drawboard,
          timestamp: 1,
          includedraw: true,
          elements: drawelementfromboard(drawboard),
        },
        expect: {
          mode: 'json',
          json: maptickrun(memorytickboard(drawboard, 1)),
        },
      },
    ],
  })

  const ordterrain = new Array<BOARD_ELEMENT>(BOARD_SIZE)
  const player = maketickobject('pid_0000_testplayer', ':tick\n#end')
  const bullet = maketickobject('sid_bullet', ':tick\n#end', COLLISION.ISBULLET)
  const other = maketickobject('sid_other', ':tick\n#end', COLLISION.ISSOLID)
  const ghost = maketickobject('sid_ghost', ':tick\n#end', COLLISION.ISGHOST)
  const orderboard = maketickboard(
    {
      [player.id ?? '']: player,
      [bullet.id ?? '']: bullet,
      [other.id ?? '']: other,
      [ghost.id ?? '']: ghost,
    },
    ordterrain,
  )

  writfixture('drawpass.tick_order', {
    name: 'drawpass.tick_order',
    initial: {},
    steps: [
      {
        op: 'tick_board',
        args: {
          board: orderboard,
          timestamp: 1,
          includedraw: true,
          elements: drawelementfromboard(orderboard),
        },
        expect: {
          mode: 'json',
          json: maptickrun(memorytickboard(orderboard, 1)).filter(
            (item) => item.pass !== 'draw',
          ),
        },
      },
    ],
  })

  writfixture('drawpass.omit_draw', {
    name: 'drawpass.omit_draw',
    initial: {},
    steps: [
      {
        op: 'tick_board',
        args: {
          board: drawboard,
          timestamp: 1,
          includedraw: false,
          elements: drawelementfromboard(drawboard),
        },
        expect: {
          mode: 'json',
          json: maptickrun(memorytickboard(drawboard, 1, false)).filter(
            (item) => item.pass !== 'draw',
          ),
        },
      },
    ],
  })

  writfixture('drawpass.draw_allowids', {
    name: 'drawpass.draw_allowids',
    initial: {},
    steps: [
      {
        op: 'tick_board',
        args: {
          board: drawboard,
          timestamp: 1,
          includedraw: true,
          drawallowids: ['sid_draw'],
          elements: drawelementfromboard(drawboard),
        },
        expect: {
          mode: 'json',
          json: maptickrun(
            memorytickboard(drawboard, 1, true, new Set(['sid_draw'])),
          ),
        },
      },
    ],
  })

  memoryboundariesclear()
  const dirtyboardobjects = {
    sid_move: {
      id: 'sid_move',
      x: 5,
      y: 5,
      code: ':drawdisplay',
      has_draw: true,
    },
  }
  const dirty1 = cppupdatedrawdirtyexpect({ objects: dirtyboardobjects })
  const dirty2 = cppupdatedrawdirtyexpect(
    { objects: dirtyboardobjects },
    { drawlastfp: dirty1.drawlastfp, drawlastxy: dirty1.drawlastxy },
  )
  const dirty3 = cppupdatedrawdirtyexpect(
    {
      objects: {
        sid_move: {
          id: 'sid_move',
          x: 6,
          y: 6,
          code: ':drawdisplay',
          has_draw: true,
        },
      },
    },
    { drawlastfp: dirty2.drawlastfp, drawlastxy: dirty2.drawlastxy },
  )

  writfixture('drawpass.update_dirty_move', {
    name: 'drawpass.update_dirty_move',
    initial: {},
    steps: [
      {
        op: 'update_draw_dirty',
        args: {
          board: { objects: dirtyboardobjects },
          timestamp: 1,
          runtime: {},
        },
        expect: { mode: 'json', json: dirty1 },
      },
      {
        op: 'update_draw_dirty',
        args: {
          board: { objects: dirtyboardobjects },
          timestamp: 2,
          runtime: {
            drawlastfp: dirty1.drawlastfp,
            drawlastxy: dirty1.drawlastxy,
          },
        },
        expect: { mode: 'json', json: dirty2 },
      },
      {
        op: 'update_draw_dirty',
        args: {
          board: {
            objects: {
              sid_move: {
                id: 'sid_move',
                x: 6,
                y: 6,
                code: ':drawdisplay',
                has_draw: true,
              },
            },
          },
          timestamp: 3,
          runtime: {
            drawlastfp: dirty2.drawlastfp,
            drawlastxy: dirty2.drawlastxy,
          },
        },
        expect: { mode: 'json', json: dirty3 },
      },
    ],
  })

  mockedmemoryreadflags.mockReturnValue({})
  writfixture('elementprefix.no_id', {
    name: 'elementprefix.no_id',
    initial: {},
    steps: [
      {
        op: 'element_ticker_prefix',
        args: prefixargs(baseprefixelement({ id: undefined })),
        expect: {
          mode: 'string',
          string: memoryelementtotickerprefix(
            baseprefixelement({ id: undefined }),
          ),
        },
      },
    ],
  })

  writfixture('elementprefix.displayname', {
    name: 'elementprefix.displayname',
    initial: {},
    steps: [
      {
        op: 'element_ticker_prefix',
        args: prefixargs(baseprefixelement({ displayname: 'Shown' })),
        expect: {
          mode: 'string',
          string: memoryelementtotickerprefix(
            baseprefixelement({ displayname: 'Shown' }),
          ),
        },
      },
    ],
  })

  const kindel = baseprefixelement()
  memorywriteboardelementruntime(kindel, {
    kinddata: { id: 'chest', name: 'chest', displayname: 'FromKind' },
  })

  writfixture('elementprefix.kind_displayname', {
    name: 'elementprefix.kind_displayname',
    initial: {},
    steps: [
      {
        op: 'element_ticker_prefix',
        args: prefixargs(
          kindel,
          {},
          { id: 'chest', name: 'chest', displayname: 'FromKind' },
        ),
        expect: { mode: 'string', string: memoryelementtotickerprefix(kindel) },
      },
    ],
  })

  writfixture('elementprefix.logical_name', {
    name: 'elementprefix.logical_name',
    initial: {},
    steps: [
      {
        op: 'element_ticker_prefix',
        args: prefixargs(baseprefixelement()),
        expect: {
          mode: 'string',
          string: memoryelementtotickerprefix(baseprefixelement()),
        },
      },
    ],
  })

  mockedmemoryreadflags.mockReturnValue({ user: 'Pat' })
  const playerel = baseprefixelement({
    kind: 'player',
    displayname: 'ignored for player',
  })

  writfixture('elementprefix.player_user', {
    name: 'elementprefix.player_user',
    initial: {},
    steps: [
      {
        op: 'element_ticker_prefix',
        args: prefixargs(playerel, { user: 'Pat' }),
        expect: {
          mode: 'string',
          string: memoryelementtotickerprefix(playerel),
        },
      },
      {
        op: 'element_log_prefix',
        args: prefixargs(playerel, { user: 'Pat' }),
        expect: { mode: 'string', string: memoryelementtologprefix(playerel) },
      },
    ],
  })

  mockedmemoryreadflags.mockReturnValue({})
  const tickeronly = baseprefixelement({ displayname: 'TickerOnly' })

  writfixture('elementprefix.ticker_vs_log', {
    name: 'elementprefix.ticker_vs_log',
    initial: {},
    steps: [
      {
        op: 'element_ticker_prefix',
        args: prefixargs(tickeronly),
        expect: {
          mode: 'string',
          string: memoryelementtotickerprefix(tickeronly),
        },
      },
      {
        op: 'element_log_prefix',
        args: prefixargs(tickeronly),
        expect: {
          mode: 'string',
          string: memoryelementtologprefix(tickeronly),
        },
      },
    ],
  })

  writfixture('cornerexit.agree', {
    name: 'cornerexit.agree',
    initial: {},
    steps: [
      {
        op: 'corner_exit_resolve',
        args: {
          board: { id: 'cur', exitnorth: 'n', exiteast: 'e' },
          addrmap: {
            n: { id: 'north', exiteast: 'addr-ne' },
            e: { id: 'east', exitnorth: 'addr-ne' },
            'addr-ne': { id: 'target-ne' },
          },
        },
        expect: {
          mode: 'json',
          json: { exitne: 'target-ne', exitnw: '', exitse: '', exitsw: '' },
        },
      },
    ],
  })

  writfixture('cornerexit.single_path', {
    name: 'cornerexit.single_path',
    initial: {},
    steps: [
      {
        op: 'corner_exit_resolve',
        args: {
          board: { id: 'cur', exitnorth: 'n', exiteast: 'e' },
          addrmap: {
            n: { id: 'north', exiteast: 'addr-ne' },
            e: { id: 'east' },
            'addr-ne': { id: 'only-ne' },
          },
        },
        expect: {
          mode: 'json',
          json: { exitne: 'only-ne', exitnw: '', exitse: '', exitsw: '' },
        },
      },
    ],
  })

  writfixture('cornerexit.disputed', {
    name: 'cornerexit.disputed',
    initial: {},
    steps: [
      {
        op: 'corner_exit_resolve',
        args: {
          board: { id: 'cur', exitnorth: 'n', exiteast: 'e' },
          addrmap: {
            n: { id: 'north', exiteast: 'addr-a' },
            e: { id: 'east', exitnorth: 'addr-b' },
            'addr-a': { id: 'ida' },
            'addr-b': { id: 'idb' },
          },
        },
        expect: {
          mode: 'json',
          json: {
            exitne: CORNER_EXIT_DISPUTED,
            exitnw: '',
            exitse: '',
            exitsw: '',
          },
        },
      },
    ],
  })

  writfixture('cornerexit.both_fail', {
    name: 'cornerexit.both_fail',
    initial: {},
    steps: [
      {
        op: 'corner_exit_resolve',
        args: {
          board: { id: 'cur', exitnorth: 'n', exiteast: 'e' },
          addrmap: { n: { id: 'north' }, e: { id: 'east' } },
        },
        expect: {
          mode: 'json',
          json: { exitne: '', exitnw: '', exitse: '', exitsw: '' },
        },
      },
    ],
  })

  writfixture('permissions.controlled', {
    name: 'permissions.controlled',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_is_controlled',
        args: { command: 'allow' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_is_controlled',
        args: { command: 'access' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_is_controlled',
        args: { command: 'run' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_is_controlled',
        args: { command: 'build' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_is_controlled',
        args: { command: 'pageexport' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_is_controlled',
        args: { command: 'synth1' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_is_controlled',
        args: { command: 'shortsend' },
        expect: { mode: 'json', json: false },
      },
      {
        op: 'permission_is_controlled',
        args: { command: 'unknown' },
        expect: { mode: 'json', json: false },
      },
    ],
  })

  writfixture('permissions.map_command', {
    name: 'permissions.map_command',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_map_command',
        args: { command: 'access' },
        expect: { mode: 'string', string: 'risk' },
      },
      {
        op: 'permission_map_command',
        args: { command: 'pageexport' },
        expect: { mode: 'string', string: 'risk' },
      },
      {
        op: 'permission_map_command',
        args: { command: 'synth1' },
        expect: { mode: 'string', string: 'speaker' },
      },
      {
        op: 'permission_map_command',
        args: { command: 'run' },
        expect: { mode: 'string', string: 'coder' },
      },
      {
        op: 'permission_map_command',
        args: { command: 'build' },
        expect: { mode: 'string', string: 'build' },
      },
    ],
  })

  memorysetcommandpermissions([], {}, 'creative', {}, {}, undefined, undefined)
  writfixture('permissions.canrun_operator', {
    name: 'permissions.canrun_operator',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_set_operator',
        args: { operator: 'operator' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_can_run',
        args: { player: 'operator', command: 'nuke' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('operator', 'nuke'),
        },
      },
      {
        op: 'permission_can_run',
        args: { player: 'operator', command: 'allow' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('operator', 'allow'),
        },
      },
    ],
  })

  memorysetcommandpermissions([], {}, 'creative', {}, {}, undefined, undefined)
  writfixture('permissions.canrun_no_token', {
    name: 'permissions.canrun_no_token',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_can_run',
        args: { player: 'player1', command: 'toast' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('player1', 'toast'),
        },
      },
    ],
  })

  memorysetcommandpermissions([], {}, 'creative', {}, {}, undefined, undefined)
  memorysetplayertotoken('player1', 'token-a')
  memorysetrolefortoken('token-a', 'player')
  writfixture('permissions.canrun_allowlisted', {
    name: 'permissions.canrun_allowlisted',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_set_player_token',
        args: { player: 'player1', token: 'token-a' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_set_role_for_token',
        args: { token: 'token-a', role: 'player' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_can_run',
        args: { player: 'player1', command: 'toast' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('player1', 'toast'),
        },
      },
    ],
  })

  writfixture('permissions.canrun_deny_allowlist', {
    name: 'permissions.canrun_deny_allowlist',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_set_player_token',
        args: { player: 'player1', token: 'token-a' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_set_role_for_token',
        args: { token: 'token-a', role: 'player' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_can_run',
        args: { player: 'player1', command: 'allow' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('player1', 'allow'),
        },
      },
    ],
  })

  memorysetcommandpermissions([], {}, 'creative', {}, {}, undefined, undefined)
  memorysetplayertotoken('player1', 'token-admin')
  memorysetrolefortoken('token-admin', 'admin')
  writfixture('permissions.admin_role', {
    name: 'permissions.admin_role',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_set_player_token',
        args: { player: 'player1', token: 'token-admin' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_set_role_for_token',
        args: { token: 'token-admin', role: 'admin' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_can_run',
        args: { player: 'player1', command: 'nuke' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('player1', 'nuke'),
        },
      },
      {
        op: 'permission_can_run',
        args: { player: 'player1', command: 'allow' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('player1', 'allow'),
        },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'admin', family: 'roles' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_can_run',
        args: { player: 'player1', command: 'book' },
        expect: {
          mode: 'json',
          json: permissioncanrunexpect('player1', 'book'),
        },
      },
    ],
  })

  memoryapplypermissionconfig('lockdown')
  writfixture('permissions.lockdown_config', {
    name: 'permissions.lockdown_config',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_apply_config',
        args: { config: 'lockdown' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_read_config',
        expect: { mode: 'string', string: 'lockdown' },
      },
      {
        op: 'permission_read_allowlist',
        expect: {
          mode: 'json',
          json: {
            admin: sortedrolefamilies('admin'),
            mod: sortedrolefamilies('mod'),
            player: sortedrolefamilies('player'),
          },
        },
      },
    ],
  })
  memoryapplypermissionconfig('creative')

  writfixture('permissions.creative_config', {
    name: 'permissions.creative_config',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_apply_config',
        args: { config: 'creative' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'build' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'explore' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'persist' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'bridge' },
        expect: { mode: 'json', json: false },
      },
    ],
  })

  memorysetcommandpermissions([], {}, 'lockdown', {}, {}, undefined, undefined)
  writfixture('permissions.hydrate_lockdown', {
    name: 'permissions.hydrate_lockdown',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_set_command_permissions',
        args: {
          bannedtokens: [],
          rolebytoken: {},
          permissionconfig: 'lockdown',
          permissionoverrideaddbyrole: {},
          permissionoverrideremovebyrole: {},
        },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_read_config',
        expect: { mode: 'string', string: 'lockdown' },
      },
      {
        op: 'permission_read_allowlist',
        expect: {
          mode: 'json',
          json: {
            admin: sortedrolefamilies('admin'),
            mod: sortedrolefamilies('mod'),
            player: [],
          },
        },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'mod', family: 'persist' },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  writfixture('permissions.migrate_custom', {
    name: 'permissions.migrate_custom',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_set_command_permissions',
        args: {
          bannedtokens: [],
          rolebytoken: {},
          permissionconfig: 'custom',
          allowlistbyrole: { player: ['speaker'] },
          allowlistbyrolecustom: { player: ['speaker'] },
        },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_read_config',
        expect: { mode: 'string', string: 'lockdown' },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'speaker' },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  writfixture('permissions.keep_overrides', {
    name: 'permissions.keep_overrides',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_apply_config',
        args: { config: 'creative' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_allow_command',
        args: { role: 'player', command: 'roles' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'roles' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_apply_config',
        args: { config: 'lockdown' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'roles' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_read_config',
        expect: { mode: 'string', string: 'lockdown' },
      },
    ],
  })

  writfixture('permissions.allow_revoke', {
    name: 'permissions.allow_revoke',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_apply_config',
        args: { config: 'creative' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_allow_command',
        args: { role: 'player', command: 'roles' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'roles' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_revoke_command',
        args: { role: 'player', command: 'build' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'build' },
        expect: { mode: 'json', json: false },
      },
    ],
  })

  memoryapplypermissionconfig('creative')
  writfixture('permissions.serialize', {
    name: 'permissions.serialize',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_serialize',
        expect: { mode: 'json', json: memoryserializepermissions() },
      },
    ],
  })

  memoryapplypermissionconfig('lockdown')
  memoryallowcommand('player', 'risk')
  const serialized = memoryserializepermissions()
  writfixture('permissions.roundtrip', {
    name: 'permissions.roundtrip',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_apply_config',
        args: { config: 'lockdown' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_allow_command',
        args: { role: 'player', command: 'risk' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_serialize',
        expect: { mode: 'json', json: serialized },
      },
      {
        op: 'permission_set_command_permissions',
        args: {
          bannedtokens: serialized.bannedtokens,
          rolebytoken: serialized.rolebytoken,
          permissionconfig: serialized.permissionconfig,
          permissionoverrideaddbyrole: serialized.permissionoverrideaddbyrole,
          permissionoverrideremovebyrole:
            serialized.permissionoverrideremovebyrole,
        },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_read_config',
        expect: { mode: 'string', string: 'lockdown' },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'risk' },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  memoryapplypermissionconfig('lockdown')
  memoryallowcommand('player', 'risk')
  const permbreakdown = memoryreadallowlistbreakdownbyrole()
  const breakdownjson = {
    admin: {
      effective: Array.from(permbreakdown.admin?.effective ?? []).sort(),
      frombase: Array.from(permbreakdown.admin?.frombase ?? []).sort(),
      overridegrant: Array.from(
        permbreakdown.admin?.overridegrant ?? [],
      ).sort(),
      overridedeny: Array.from(permbreakdown.admin?.overridedeny ?? []).sort(),
    },
    mod: {
      effective: Array.from(permbreakdown.mod?.effective ?? []).sort(),
      frombase: Array.from(permbreakdown.mod?.frombase ?? []).sort(),
      overridegrant: Array.from(permbreakdown.mod?.overridegrant ?? []).sort(),
      overridedeny: Array.from(permbreakdown.mod?.overridedeny ?? []).sort(),
    },
    player: {
      effective: Array.from(permbreakdown.player?.effective ?? []).sort(),
      frombase: Array.from(permbreakdown.player?.frombase ?? []).sort(),
      overridegrant: Array.from(
        permbreakdown.player?.overridegrant ?? [],
      ).sort(),
      overridedeny: Array.from(permbreakdown.player?.overridedeny ?? []).sort(),
    },
  }
  writfixture('permissions.breakdown', {
    name: 'permissions.breakdown',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_apply_config',
        args: { config: 'lockdown' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_allow_command',
        args: { role: 'player', command: 'risk' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_read_breakdown',
        expect: { mode: 'json', json: breakdownjson },
      },
    ],
  })

  writfixture('permissions.restore_creative', {
    name: 'permissions.restore_creative',
    initial: {},
    steps: [
      { op: 'permission_reset', expect: { mode: 'json', json: true } },
      {
        op: 'permission_set_command_permissions',
        args: {
          bannedtokens: [],
          rolebytoken: {},
          permissionconfig: 'creative',
          allowlistbyrole: {
            admin: DEFAULT_ALLOWLIST_BY_ROLE.admin,
            mod: DEFAULT_ALLOWLIST_BY_ROLE.mod,
            player: DEFAULT_ALLOWLIST_BY_ROLE.player,
          },
          allowlistbyrolecustom: {},
        },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'permission_read_config',
        expect: { mode: 'string', string: 'creative' },
      },
      {
        op: 'permission_role_has_family',
        args: { role: 'player', family: 'speaker' },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  const synthsession = synthsessionjson()
  writfixture('synth.voices_default', {
    name: 'synth.voices_default',
    initial: {},
    steps: [
      {
        op: 'synth_setup_session',
        args: { session: synthsession },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_read_voices',
        args: { boardid: 'bd-test' },
        expect: {
          mode: 'json',
          json: {
            '0': { square: '' },
            '1': { square: '' },
            '2': { square: '' },
            '3': { square: '' },
          },
        },
      },
    ],
  })

  writfixture('synth.merge_restart', {
    name: 'synth.merge_restart',
    initial: {},
    steps: [
      {
        op: 'synth_setup_session',
        args: { session: synthsessionjson() },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_merge_voice',
        args: { boardid: 'bd-restart', idx: 0, config: 'sine', value: '' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_merge_voice',
        args: { boardid: 'bd-restart', idx: 0, config: 'restart', value: '' },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_read_voices',
        args: { boardid: 'bd-restart' },
        expect: {
          mode: 'json',
          json: {
            '0': { square: '' },
            '1': { square: '' },
            '2': { square: '' },
            '3': { square: '' },
          },
        },
      },
    ],
  })

  memoryresetbooks([])
  const synthbook = memorycreatebook([])
  synthbook.name = 'main'
  memoryresetbooks([synthbook])
  memorymergesynthvoice('bd-merge', 0, 'freq', 440)
  const mergevoices = memoryreadsynth('bd-merge')?.voices

  writfixture('synth.merge_persist', {
    name: 'synth.merge_persist',
    initial: {},
    steps: [
      {
        op: 'synth_setup_session',
        args: { session: synthsessionjson() },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_merge_voice',
        args: { boardid: 'bd-merge', idx: 0, config: 'freq', value: 440 },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_read_voices',
        args: { boardid: 'bd-merge' },
        expect: { mode: 'json', json: mergevoices },
      },
    ],
  })

  writfixture('synth.playqueue_init', {
    name: 'synth.playqueue_init',
    initial: {},
    steps: [
      {
        op: 'synth_setup_session',
        args: { session: synthsessionjson() },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_read_playqueue',
        args: { boardid: 'bd-play' },
        expect: { mode: 'json', json: [] },
      },
    ],
  })

  writfixture('synth.queue_board', {
    name: 'synth.queue_board',
    initial: {},
    steps: [
      {
        op: 'synth_setup_session',
        args: { session: synthsessionjson() },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_queue_play',
        args: { boardid: 'bd-queue', play: 'c' },
        expect: {
          mode: 'json',
          json: { queued: true, synthplay_fired: false, play: 'c' },
        },
      },
      {
        op: 'synth_read_playqueue',
        args: { boardid: 'bd-queue' },
        expect: { mode: 'json', json: [['c', 4]] },
      },
    ],
  })

  writfixture('synth.queue_global', {
    name: 'synth.queue_global',
    initial: {},
    steps: [
      {
        op: 'synth_setup_session',
        args: { session: synthsessionjson() },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_queue_play',
        args: { boardid: '', play: 'c' },
        expect: {
          mode: 'json',
          json: { queued: false, synthplay_fired: true, play: 'c' },
        },
      },
    ],
  })

  writfixture('synth.queue_stop', {
    name: 'synth.queue_stop',
    initial: {},
    steps: [
      {
        op: 'synth_setup_session',
        args: { session: synthsessionjson() },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'synth_queue_play',
        args: { boardid: 'bd-stop', play: 'c' },
        expect: {
          mode: 'json',
          json: { queued: true, synthplay_fired: false, play: 'c' },
        },
      },
      {
        op: 'synth_queue_play',
        args: { boardid: 'bd-stop', play: '' },
        expect: {
          mode: 'json',
          json: { queued: false, synthplay_fired: true, play: '' },
        },
      },
      {
        op: 'synth_read_playqueue',
        args: { boardid: 'bd-stop' },
        expect: { mode: 'json', json: [] },
      },
    ],
  })

  writfixture('lighting.yscale', {
    name: 'lighting.yscale',
    initial: {},
    steps: [
      {
        op: 'lighting_yscale',
        expect: { mode: 'json', json: LIGHTING_RAY_TILE_YSCALE },
      },
      {
        op: 'lighting_yscale',
        expect: { mode: 'json', json: CHAR_HEIGHT / CHAR_WIDTH },
      },
    ],
  })

  writfixture('lighting.mixmaxrange_east', {
    name: 'lighting.mixmaxrange_east',
    initial: {},
    steps: [
      {
        op: 'lighting_mixmaxrange',
        args: { from: { x: 0, y: 0 }, dest: { x: 1, y: 0 } },
        expect: {
          mode: 'json',
          json: lightingmixmaxrange({ x: 0, y: 0 }, { x: 1, y: 0 }),
        },
      },
    ],
  })

  writfixture('lighting.mixmaxrange_vertical', {
    name: 'lighting.mixmaxrange_vertical',
    initial: {},
    steps: [
      {
        op: 'lighting_mixmaxrange',
        args: { from: { x: 10, y: 10 }, dest: { x: 10, y: 11 } },
        expect: {
          mode: 'json',
          json: lightingmixmaxrange({ x: 10, y: 10 }, { x: 10, y: 11 }),
        },
      },
    ],
  })

  const terrainspan = lightingmixmaxrange(
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    'terrain',
  )
  const objectspan = lightingmixmaxrange(
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    'object',
  )
  const terrainwidth =
    terrainspan[0] <= terrainspan[1]
      ? terrainspan[1] - terrainspan[0]
      : 360 - terrainspan[0] + terrainspan[1]
  const objectwidth =
    objectspan[0] <= objectspan[1]
      ? objectspan[1] - objectspan[0]
      : 360 - objectspan[0] + objectspan[1]

  writfixture('lighting.mixmaxrange_object_narrower', {
    name: 'lighting.mixmaxrange_object_narrower',
    initial: {},
    steps: [
      {
        op: 'lighting_mixmaxrange',
        args: { from: { x: 0, y: 0 }, dest: { x: 3, y: 0 }, kind: 'terrain' },
        expect: { mode: 'json', json: terrainspan },
      },
      {
        op: 'lighting_mixmaxrange',
        args: { from: { x: 0, y: 0 }, dest: { x: 3, y: 0 }, kind: 'object' },
        expect: { mode: 'json', json: objectspan },
      },
    ],
  })
  expect(objectwidth).toBeLessThan(terrainwidth)

  const blockedpartial: [number, number, number][] = []
  memorylightingaddrangetoblocked(blockedpartial, [10, 80, 0.4])
  writfixture('lighting.blocked_partial', {
    name: 'lighting.blocked_partial',
    initial: {},
    steps: [
      {
        op: 'lighting_addrange_blocked',
        args: { initial: [], range: [10, 80, 0.4] },
        expect: { mode: 'json', json: blockedpartial },
      },
    ],
  })

  const blockedmerge: [number, number, number][] = []
  memorylightingaddrangetoblocked(blockedmerge, [0, 45, 1])
  memorylightingaddrangetoblocked(blockedmerge, [30, 60, 1])
  writfixture('lighting.blocked_merge', {
    name: 'lighting.blocked_merge',
    initial: {},
    steps: [
      {
        op: 'lighting_addrange_blocked',
        args: { initial: [], range: [0, 45, 1] },
        expect: { mode: 'json', json: [[0, 45, 1]] },
      },
      {
        op: 'lighting_addrange_blocked',
        args: { initial: [[0, 45, 1]], range: [30, 60, 1] },
        expect: { mode: 'json', json: blockedmerge },
      },
    ],
  })

  const blockednomerge: [number, number, number][] = []
  memorylightingaddrangetoblocked(blockednomerge, [0, 30, 0.5])
  memorylightingaddrangetoblocked(blockednomerge, [10, 50, 1])
  writfixture('lighting.blocked_no_merge_partial', {
    name: 'lighting.blocked_no_merge_partial',
    initial: {},
    steps: [
      {
        op: 'lighting_addrange_blocked',
        args: { initial: [[0, 30, 0.5]], range: [10, 50, 1] },
        expect: { mode: 'json', json: blockednomerge },
      },
    ],
  })

  const markalphas = new Array<number>(BOARD_SIZE).fill(1)
  memoryboardlightingmarkplayer(emptyterrainboard(), markalphas, {
    id: 'sprite:test',
    x: 12,
    y: 7,
    char: 0,
    color: 0,
    bg: 0,
    stat: 0,
  })
  const marksx = 12
  const marksy = 7
  const markindices: number[] = []
  for (let y = marksy - 1; y <= marksy + 1; ++y) {
    for (let x = marksx - 1; x <= marksx + 1; ++x) {
      markindices.push(boardindex(x, y))
    }
  }
  const marksnap: Record<string, number> = {}
  for (const idx of markindices) {
    marksnap[String(idx)] = markalphas[idx]
  }
  writfixture('boardlighting.mark_player', {
    name: 'boardlighting.mark_player',
    initial: {},
    steps: [
      {
        op: 'lighting_mark_player',
        args: {
          board: emptyterrainboard(),
          sprite: { x: marksx, y: marksy },
          snapshot_indices: markindices,
        },
        expect: { mode: 'json', json: marksnap },
      },
    ],
  })

  const radiusalphas = new Array<number>(BOARD_SIZE).fill(0.25)
  memoryboardlightingapplyobject(
    emptyterrainboard(),
    radiusalphas,
    {},
    { id: 'sprite:test', x: 20, y: 10, char: 0, color: 0, bg: 0, stat: 0 },
    1,
  )
  const radiuscenter = boardindex(20, 10)
  writfixture('boardlighting.radius_one', {
    name: 'boardlighting.radius_one',
    initial: {},
    steps: [
      {
        op: 'lighting_apply_object',
        args: {
          board: emptyterrainboard(),
          sprite: { x: 20, y: 10 },
          light: 1,
          fill: 0.25,
          snapshot_indices: [radiuscenter],
        },
        expect: {
          mode: 'json',
          json: { [String(radiuscenter)]: radiusalphas[radiuscenter] },
        },
      },
    ],
  })

  const walkalphas = new Array<number>(BOARD_SIZE).fill(1)
  memoryboardlightingapplyobject(
    emptyterrainboard(),
    walkalphas,
    {},
    { id: 'sprite:test', x: 15, y: 12, char: 0, color: 0, bg: 0, stat: 0 },
    4,
  )
  const walkcenter = boardindex(15, 12)
  const walkeast = boardindex(17, 12)
  writfixture('boardlighting.walkable_range', {
    name: 'boardlighting.walkable_range',
    initial: {},
    steps: [
      {
        op: 'lighting_apply_object',
        args: {
          board: emptyterrainboard(),
          sprite: { x: 15, y: 12 },
          light: 4,
          fill: 1,
          snapshot_indices: [walkcenter, walkeast],
        },
        expect: {
          mode: 'json',
          json: {
            [String(walkcenter)]: walkalphas[walkcenter],
            [String(walkeast)]: walkalphas[walkeast],
          },
        },
      },
    ],
  })

  const boardopen = emptyterrainboard()
  const boardwall = emptyterrainboard()
  boardwall.terrain[boardindex(11, 10)] = { collision: COLLISION.ISSOLID }
  const solidopen = new Array<number>(BOARD_SIZE).fill(1)
  const solidwall = new Array<number>(BOARD_SIZE).fill(1)
  const solidsprite = {
    id: 'sprite:test',
    x: 10,
    y: 10,
    char: 0,
    color: 0,
    bg: 0,
    stat: 0,
  }
  memoryboardlightingapplyobject(boardopen, solidopen, {}, solidsprite, 6)
  memoryboardlightingapplyobject(boardwall, solidwall, {}, solidsprite, 6)
  const beyond = boardindex(14, 10)
  writfixture('boardlighting.solid_occlusion', {
    name: 'boardlighting.solid_occlusion',
    initial: {},
    steps: [
      {
        op: 'lighting_apply_object',
        args: {
          board: boardopen,
          sprite: { x: 10, y: 10 },
          light: 6,
          fill: 1,
          snapshot_indices: [beyond],
        },
        expect: {
          mode: 'approx_json',
          epsilon: 0.35,
          json: { [String(beyond)]: solidopen[beyond] },
        },
      },
      {
        op: 'lighting_apply_object',
        args: {
          board: boardwall,
          sprite: { x: 10, y: 10 },
          light: 6,
          fill: 1,
          snapshot_indices: [beyond],
        },
        expect: {
          mode: 'approx_json',
          epsilon: 0.35,
          json: { [String(beyond)]: solidwall[beyond] },
        },
      },
      {
        op: 'lighting_compare_gte',
        args: { a: solidwall[beyond], b: solidopen[beyond] },
        expect: { mode: 'json', json: true },
      },
    ],
  })
  expect(solidopen[beyond]).toBeLessThan(1)
  expect(solidwall[beyond]).toBeGreaterThanOrEqual(solidopen[beyond])

  const blockerid = 'blocker'
  const bx = 18
  const by = 10
  const boardplain = emptyterrainboard()
  const boardwithobj = emptyterrainboard()
  boardwithobj.objects[blockerid] = {
    id: blockerid,
    x: bx,
    y: by,
    runtime: '',
  }
  const lookup = new Array<string>(BOARD_SIZE).fill('')
  lookup[boardindex(bx, by)] = blockerid
  const plainalphas = new Array<number>(BOARD_SIZE).fill(1)
  const withalphas = new Array<number>(BOARD_SIZE).fill(1)
  const lookupsprite = {
    id: 'sprite:test',
    x: 15,
    y: 10,
    char: 0,
    color: 0,
    bg: 0,
    stat: 0,
  }
  memoryboardlightingapplyobject(boardplain, plainalphas, {}, lookupsprite, 7)
  memoryboardlightingapplyobject(
    boardwithobj,
    withalphas,
    { lookup },
    lookupsprite,
    7,
  )
  const eastlookup = boardindex(21, 10)
  writfixture('boardlighting.lookup_occlusion', {
    name: 'boardlighting.lookup_occlusion',
    initial: {},
    steps: [
      {
        op: 'lighting_apply_object',
        args: {
          board: boardplain,
          sprite: { x: 15, y: 10 },
          light: 7,
          fill: 1,
          snapshot_indices: [eastlookup],
        },
        expect: {
          mode: 'json',
          json: { [String(eastlookup)]: plainalphas[eastlookup] },
        },
      },
      {
        op: 'lighting_apply_object',
        args: {
          board: boardwithobj,
          sprite: { x: 15, y: 10 },
          light: 7,
          fill: 1,
          lookup,
          snapshot_indices: [eastlookup],
        },
        expect: {
          mode: 'approx_json',
          epsilon: 0.75,
          json: { [String(eastlookup)]: withalphas[eastlookup] },
        },
      },
      {
        op: 'lighting_compare_gte',
        args: { a: withalphas[eastlookup], b: plainalphas[eastlookup] },
        expect: { mode: 'json', json: true },
      },
    ],
  })
  expect(plainalphas[eastlookup]).toBeLessThan(1)
  expect(withalphas[eastlookup]).toBeGreaterThanOrEqual(plainalphas[eastlookup])

  function blockeralphasfull(ids: { id: string; x: number }[]) {
    const board = emptyterrainboard()
    const lookuparr = new Array<string>(BOARD_SIZE).fill('')
    const y = 10
    for (const { id, x } of ids) {
      board.objects[id] = { id, x, y, runtime: '' }
      lookuparr[boardindex(x, y)] = id
    }
    const alphas = new Array<number>(BOARD_SIZE).fill(1)
    memoryboardlightingapplyobject(
      board,
      alphas,
      { lookup: lookuparr },
      { id: 'sprite:test', x: 15, y, char: 0, color: 0, bg: 0, stat: 0 },
      7,
    )
    return { board, lookup: lookuparr, alphas }
  }
  const blockerplain = blockeralphasfull([])
  const blockerone = blockeralphasfull([{ id: 'o1', x: 17 }])
  const blockertwo = blockeralphasfull([
    { id: 'o1', x: 16 },
    { id: 'o2', x: 18 },
  ])
  const eastblock = boardindex(20, 10)
  writfixture('boardlighting.two_blockers', {
    name: 'boardlighting.two_blockers',
    initial: {},
    steps: [
      {
        op: 'lighting_apply_object',
        args: {
          board: blockerplain.board,
          sprite: { x: 15, y: 10 },
          light: 7,
          fill: 1,
          lookup: blockerplain.lookup,
          snapshot_indices: [eastblock],
        },
        expect: {
          mode: 'json',
          json: { [String(eastblock)]: blockerplain.alphas[eastblock] },
        },
      },
      {
        op: 'lighting_apply_object',
        args: {
          board: blockerone.board,
          sprite: { x: 15, y: 10 },
          light: 7,
          fill: 1,
          lookup: blockerone.lookup,
          snapshot_indices: [eastblock],
        },
        expect: {
          mode: 'approx_json',
          epsilon: 0.55,
          json: { [String(eastblock)]: blockerone.alphas[eastblock] },
        },
      },
      {
        op: 'lighting_compare_gte',
        args: {
          a: blockerone.alphas[eastblock],
          b: blockerplain.alphas[eastblock],
        },
        expect: { mode: 'json', json: true },
      },
      {
        op: 'lighting_apply_object',
        args: {
          board: blockertwo.board,
          sprite: { x: 15, y: 10 },
          light: 7,
          fill: 1,
          lookup: blockertwo.lookup,
          snapshot_indices: [eastblock],
        },
        expect: {
          mode: 'approx_json',
          epsilon: 0.55,
          json: { [String(eastblock)]: blockertwo.alphas[eastblock] },
        },
      },
      {
        op: 'lighting_compare_gte',
        args: {
          a: blockertwo.alphas[eastblock],
          b: blockerone.alphas[eastblock],
        },
        expect: { mode: 'json', json: true },
      },
    ],
  })

  const corridor_y = 12
  const x0 = 8
  const x1 = 48
  const corridorboard = emptyterrainboard()
  for (let x = x0; x <= x1; x++) {
    corridorboard.terrain[boardindex(x, corridor_y - 1)] = {
      collision: COLLISION.ISSOLID,
    }
    corridorboard.terrain[boardindex(x, corridor_y + 1)] = {
      collision: COLLISION.ISSOLID,
    }
  }
  const corridoralphas = new Array<number>(BOARD_SIZE).fill(1)
  memoryboardlightingapplyobject(
    corridorboard,
    corridoralphas,
    {},
    {
      id: 'sprite:test',
      x: x1 - 2,
      y: corridor_y,
      char: 0,
      color: 0,
      bg: 0,
      stat: 0,
    },
    10,
  )
  writfixture('boardlighting.corridor_leak', {
    name: 'boardlighting.corridor_leak',
    initial: {},
    steps: [
      {
        op: 'lighting_apply_object',
        args: {
          board: corridorboard,
          sprite: { x: x1 - 2, y: corridor_y },
          light: 10,
          fill: 1,
          snapshot_indices: [
            boardindex(x0 + 5, corridor_y - 2),
            boardindex(x0 + 5, corridor_y + 2),
          ],
        },
        expect: {
          mode: 'json',
          json: {
            [String(boardindex(x0 + 5, corridor_y - 2))]: 1,
            [String(boardindex(x0 + 5, corridor_y + 2))]: 1,
          },
        },
      },
    ],
  })
  expect(corridoralphas[boardindex(x0 + 5, corridor_y - 2)]).toBe(1)
  expect(corridoralphas[boardindex(x0 + 5, corridor_y + 2)]).toBe(1)

  const count = readdirSync(FIXTUREDIR).filter((f) =>
    f.endsWith('.json'),
  ).length
  return count
}

describe('memory parity fixture manifest', () => {
  it('lists every fixture for memory tests', () => {
    const names = Object.values(FIXTURE_MANIFEST).flat()
    expect(names.length).toBeGreaterThan(14)
    expect(names).toContain('permissions.canrun_no_token')
    expect(names).toContain('drawpass.draw_before_tick')
    expect(names).toContain('boardlighting.mark_player')
  })
})

describe('memory parity fixture regen', () => {
  it('writes fixture corpus when REGEN_MEMORY_FIXTURES=1', () => {
    if (process.env.REGEN_MEMORY_FIXTURES !== '1') {
      return
    }
    const count = regenall()
    expect(count).toBeGreaterThan(0)
  })
})
