/* eslint-disable @typescript-eslint/no-implied-eval */
jest.mock('zss/config', () => ({
  RUNTIME: {
    YIELD_AT_COUNT: 512,
    DRAW_CHAR_SCALE: 2,
    DRAW_CHAR_WIDTH: () => 16,
    DRAW_CHAR_HEIGHT: () => 28,
  },
  LANG_DEV: false,
  LANG_TYPES: false,
  SHOW_CODE: false,
  TRACE_CODE: '',
  LOG_DEBUG: false,
  FORCE_CRT_OFF: false,
  FORCE_LOW_REZ: false,
  FORCE_TOUCH_UI: false,
}))

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { compileparse } from 'zss/feature/zztoop/compileparse'
import { compilezztoop } from 'zss/feature/zztoop/compile'
import { LANG_ZZTOOP_DIR } from 'ops/lib/fixturepaths'

// ---------------------------------------------------------------------------
// ZZT-OOP 101 corpus — one fixture per section of
// https://museumofzzt.com/article/view/747/zzt-oop-101/
//
// SCENARIOS is the article's table of contents, in order. Each row pins:
//   id     -> the raw/101/<id>.zss fixture
//   title  -> the exact article section heading
//   expect -> substrings (string => toContain) or patterns (RegExp => toMatch)
//             that the lowered (`api.*`) source must contain.
//
// A coverage guard below asserts this table stays 1:1 with the manifest, so a
// scenario can never be silently dropped or left untested.
// ---------------------------------------------------------------------------

type Scenario = { id: string; title: string; expect: Array<string | RegExp> }

const SCENARIOS: Scenario[] = [
  {
    id: '01_stats_cycles_execution',
    title: 'Stats, Cycles, And Code Execution',
    expect: [
      'api.stat(',
      'This runs the moment the object acts.',
      "api.command('end')",
    ],
  },
  {
    id: '02_scrolls',
    title: 'A Note About Scrolls',
    expect: [
      'You found a scroll!',
      "api.command('send', 'self:again')",
      "'again'",
      "api.command('end')",
    ],
  },
  {
    id: '03_syntax_formatting',
    // case-insensitive keywords: #IF / #If / #Die / #END all lower to their
    // canonical lowercase command name; :Touch -> 'touch'.
    title: 'Syntax Formatting',
    expect: [
      "'touch'",
      "api.if('alligned')",
      "api.command('shoot', 'seek')",
      "api.if('contact')",
      "api.command('die')",
      "api.command('end')",
    ],
  },
  {
    id: '04_flashing_text',
    title: 'Flashing Text And Message Windows',
    expect: [
      'api.text(',
      'Beep boop!',
      'A second line opens a message window.',
    ],
  },
  {
    id: '05_white_centered_text',
    // DIVERGENCE FROM VANILLA ZZT: the article describes a leading `$` as
    // "white centered text". zztoop does NOT special-case the `$` centering
    // directive — it preserves the line verbatim as text (`$Centered and
    // white.`), and a lone `$` is plain text too. Pinned here so the divergence
    // stays visible and intentional.
    title: 'White Centered Text',
    expect: ['api.text(', '$Centered and white.', "api.text('$')"],
  },
  {
    id: '06_hyperlinks',
    title: 'Hyperlinks',
    expect: ['api.hyperlink(', 'Accept the quest', "'yes'", 'No thank you'],
  },
  {
    id: '07_hyperlinking_external_files',
    // external-file links keep the leading `-` in their link payload
    title: 'Hyperlinking External Files',
    expect: [
      'api.hyperlink(',
      'Read the rules',
      "'-rules'",
      'Ancient lore',
      "'-lore.hlp'",
    ],
  },
  {
    id: '08_comments_prezapped_labels',
    // a comment line and a pre-zapped label share syntax: both lower to an
    // inactive label rather than executable code.
    title: 'Comments and Pre-Zapped Labels',
    expect: ['You see a locked chest.', "'open'"],
  },
  {
    id: '09_naming_objects',
    title: 'Naming Objects',
    expect: ['api.stat(', 'hancellor', "'touch'"],
  },
  {
    id: '10_labels',
    title: 'Labels: Built-In And Custom',
    expect: [
      "'touch'",
      "'shot'",
      "'bombed'",
      "'energize'",
      "'thud'",
      "'custom_event'",
    ],
  },
  {
    id: '11_moving_and_directions',
    title: 'Moving Objects And Specifying Directions',
    expect: [
      "api.command('go', 'n')",
      "api.command('go', 's')",
      "api.command('go', 'e')",
      "api.command('go', 'w')",
      "api.command('go', 'seek')",
      "api.command('go', 'flow')",
      "api.command('go', 'cw', 'n')",
      "api.command('go', 'ccw', 's')",
      "api.command('go', 'opp', 'e')",
      "api.command('go', 'rndp', 'rndns')",
      "api.command('go', 'opp', 'opp', 'opp', 'opp', 'n')",
      "api.command('shoot', 'seek')",
    ],
  },
  {
    id: '12_become',
    title: 'The #BECOME Command - Transforming An Object',
    expect: [
      "api.command('become', 'blue', 'door')",
      "api.command('become', 'passage')",
    ],
  },
  {
    id: '13_bind',
    title: 'The #BIND Command - Sharing Code And Caveats',
    expect: ["api.command('bind', 'lead')"],
  },
  {
    id: '14_change',
    title: 'The #CHANGE Command - Transforming Elements',
    expect: [
      "api.command('change', 'red', 'key', 'blue', 'door')",
      "api.command('change', 'bear', 'lion')",
    ],
  },
  {
    id: '15_char',
    title: 'The #CHAR Command - Changing Appearances',
    expect: ["api.command('char', 1)", "api.command('char', 178)"],
  },
  {
    id: '16_clear',
    title: 'The #CLEAR Command - Erasing Set Flags',
    expect: ["api.command('set', 'dirty')", "api.command('clear', 'dirty')"],
  },
  {
    id: '17_cycle',
    title: "The #CYCLE Command - Adjusting An Object's Speed And Reaction Time",
    expect: ["api.command('cycle', 1)", "api.command('cycle', 3)"],
  },
  {
    id: '18_die',
    title: 'The #DIE Command - Destroying An Object',
    expect: ["api.command('die')"],
  },
  {
    id: '19_end',
    title: 'The #END Command - Stopping Code Execution',
    expect: ["api.command('end')"],
  },
  {
    id: '20_endgame',
    title: 'The #ENDGAME Command - Game Over... Usually',
    expect: ["api.command('endgame')", "api.command('give', 'health', 100)"],
  },
  {
    id: '21_give',
    title: 'The #GIVE Command - Making Numbers Go Up',
    expect: [
      "api.command('give', 'ammo', 50)",
      "api.command('give', 'torches', 5)",
      "api.command('give', 'gems', 10)",
      "api.command('give', 'health', 25)",
      "api.command('give', 'score', 1000)",
    ],
  },
  {
    id: '22_go',
    title: 'The #GO Command - Moving Objects',
    expect: ["api.command('go', 'n')", "api.command('go', 's')"],
  },
  {
    id: '23_idle',
    title: 'The #IDLE Command - Wait A Cycle!',
    expect: ["api.command('idle')", "api.command('go', 'i')"],
  },
  {
    id: '24_if',
    title: 'The #IF Command - True And False Quizzes',
    expect: [
      "api.if('blocked', 'n')",
      "api.command('send', ':stuck')",
      "api.if('not', 'energized')",
      "api.if('alligned')",
      "api.command('shoot', 'seek')",
      "api.if('any', 'red', 'key')",
      "api.command('give', 'gems', 1)",
      "api.if('contact')",
      "api.command('die')",
      "api.if('hasorb')",
    ],
  },
  {
    id: '25_lock',
    title: 'The #LOCK Command - Preventing Unwanted Events',
    expect: ["api.command('lock')", "api.command('unlock')"],
  },
  {
    id: '26_play',
    title: 'The #PLAY Command - Creating A Squarewave Symphony',
    expect: [
      "api.command('play', 'tcdefgab')",
      "api.command('play', 'c#d#fg#a#')",
      "api.command('play', '+c-c.c')",
    ],
  },
  {
    id: '27_put',
    title: 'The #PUT Command - Adding Elements To The Board',
    expect: [
      "api.command('put', 'n', 'boulder')",
      "api.command('put', 'opp', 'flow', 'red', 'key')",
    ],
  },
  {
    id: '28_restart',
    title: "The #RESTART Command - Let's Take It From The Top",
    expect: ["api.command('restart')"],
  },
  {
    id: '29_restore',
    title: 'The #RESTORE Command - Enabling A Disabled Event',
    expect: ["api.command('restore', 'touch')", "api.command('char', 0)"],
  },
  {
    id: '30_send',
    title: 'The #SEND Command - Directing Objects To Handle Events',
    expect: [
      "api.command('send', 'greet')",
      "api.command('send', 'dog:fetch')",
      "api.command('send', 'all:panic')",
      "api.command('send', 'others:wait')",
      "api.command('send', 'self:throwstick')",
    ],
  },
  {
    id: '31_set',
    title: 'The #SET Command - Tracking Information With Flags',
    expect: ["api.command('set', 'saved')", "api.command('set', 'hasorb')"],
  },
  {
    id: '32_shoot',
    title: 'The #SHOOT Command - Firing Bullets',
    expect: [
      "api.command('shoot', 'n')",
      "api.command('shoot', 'seek')",
      "api.command('shoot', 'opp', 'flow')",
    ],
  },
  {
    id: '33_take',
    title: 'The #TAKE Command - Reducing Counters',
    expect: [
      "api.command('take', 'gems', 2, ':poor')",
      "api.command('give', 'torches', 5)",
    ],
  },
  {
    id: '34_throwstar',
    title: 'The #THROWSTAR Command - Firing Stars',
    expect: [
      "api.command('throwstar', 'seek')",
      "api.command('throwstar', 'n')",
    ],
  },
  {
    id: '35_try',
    title: 'The #TRY Command - Moving Without Getting Stuck',
    expect: [
      "api.command('try', 'seek')",
      "api.command('try', 'w', ':blocked')",
      "api.command('go', 'n')",
    ],
  },
  {
    id: '36_unlock',
    title: 'The #UNLOCK Command - Allowing Events Again',
    expect: ["api.command('unlock')"],
  },
  {
    id: '37_walk',
    title: 'The #WALK Command - Setting An Object In Motion',
    expect: [
      "api.command('walk', 'seek')",
      "api.command('walk', 'e')",
      "api.command('walk', 'i')",
      "api.command('walk', 'cw', 'flow')",
    ],
  },
  {
    id: '38_zap',
    title: 'The #ZAP Command - Disabling A Label',
    expect: ["api.command('zap', 'shot')"],
  },
]

function fixture(id: string): string {
  return readFileSync(
    path.join(LANG_ZZTOOP_DIR, 'raw', '101', `${id}.zss`),
    'utf8',
  )
}

function source(id: string): string {
  const build = compilezztoop(id, fixture(id))
  expect(build.errors ?? []).toEqual([])
  expect(build.source).toBeDefined()
  return build.source ?? ''
}

function countmatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

// ---------------------------------------------------------------------------
// Coverage guard — the scenario table must stay 1:1 with the manifest corpus.
// ---------------------------------------------------------------------------

describe('zzt-oop 101 coverage is complete', () => {
  it('the scenario table is 1:1 with the manifest oop101 corpus', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(LANG_ZZTOOP_DIR, 'manifest.json'), 'utf8'),
    ) as { oop101: string[] }
    const scenarioids = SCENARIOS.map((s) => s.id).sort()
    expect(scenarioids).toEqual([...manifest.oop101].sort())
  })

  it('every scenario id is unique', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ---------------------------------------------------------------------------
// Per-scenario: parses clean, compiles clean, lowers to the expected shape.
// ---------------------------------------------------------------------------

describe('zzt-oop 101 — each scenario parses, compiles, and lowers correctly', () => {
  for (const sc of SCENARIOS) {
    describe(`${sc.id} — ${sc.title}`, () => {
      it('parses clean', () => {
        const result = compileparse(fixture(sc.id))
        expect(result.errors ?? []).toEqual([])
        expect(result.cst).toBeDefined()
      })

      it('compiles through the shared generator', () => {
        const build = compilezztoop(sc.id, fixture(sc.id))
        expect(build.errors ?? []).toEqual([])
        expect(build.code).toBeDefined()
      })

      it('lowers to the expected api.* shape', () => {
        const code = source(sc.id)
        for (const want of sc.expect) {
          if (want instanceof RegExp) {
            expect(code).toMatch(want)
          } else {
            expect(code).toContain(want)
          }
        }
      })
    })
  }

  // the canonical article example: /S/S/S?E?E/I/I#SHOOT SEEK -> 3 south, 2
  // east, 2 idle, then a shoot. Compiled standalone so the counts reflect only
  // the chained line.
  it('splits the canonical chained line into the right move counts', () => {
    const build = compilezztoop('chain', '/s/s/s?e?e/i/i#shoot seek\n')
    expect(build.errors ?? []).toEqual([])
    const code = build.source ?? ''
    expect(countmatches(code, /api\.command\('go', 's'\)/g)).toBe(3)
    expect(countmatches(code, /api\.command\('go', 'e'\)/g)).toBe(2)
    expect(countmatches(code, /api\.command\('go', 'i'\)/g)).toBe(2)
    expect(countmatches(code, /api\.command\('shoot', 'seek'\)/g)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Runtime execution model — actually run the compiled function on a faithful
// mirror of chip.once() + the `go` firmware (always yields, returns 1 when
// blocked). Proves the article's execution-model claims, not just emission.
// ---------------------------------------------------------------------------

type CALL = string

function runprogram(
  src: string,
  opts: {
    ifresult?: boolean
    blocked?: (args: unknown[], n: number) => boolean
  } = {},
  maxticks = 64,
): CALL[][] {
  const build = compilezztoop('rt', src)
  expect(build.errors ?? []).toEqual([])
  const code = build.code!

  let ys = 0
  let lc = 0
  let ec = 1
  let ended = false
  let tick: CALL[] = []
  const counts: Record<string, number> = {}

  const api = {
    sy() {
      lc += 1
      if (lc > 5000) return true
      return ys === 1
    },
    getcase() {
      return ec
    },
    nextcase() {
      ec += 1
      return ec
    },
    jump(line: number) {
      ec = line
    },
    yield() {
      ys = 1
    },
    endofprogram() {
      ys = 1
      ended = true
      tick.push('end')
    },
    stacktrace() {
      return { line: 0, column: 0 }
    },
    command(...words: unknown[]): 0 | 1 {
      if (words.length === 0) return 0
      const [name, ...args] = words
      const cmd = String(name).toLowerCase()
      if (cmd === 'end') {
        api.endofprogram()
        return 0
      }
      if (cmd === 'go' || cmd === 'try' || cmd === 'walk') {
        api.yield()
        const key = args.join(',')
        counts[key] = (counts[key] ?? 0) + 1
        tick.push(`go ${args.join(' ')}`.trim())
        return opts.blocked && opts.blocked(args, counts[key]) ? 1 : 0
      }
      tick.push(`${cmd} ${args.join(' ')}`.trim())
      return 0
    },
    if() {
      return opts.ifresult ?? false
    },
    text(value: unknown) {
      tick.push(`text:${String(value)}`)
      return 0
    },
    stat() {
      return 0
    },
    hyperlink() {
      return 0
    },
    lock() {},
    unlock() {},
    send() {},
    zap() {},
    restore() {},
  }

  const ticks: CALL[][] = []
  for (let t = 0; t < maxticks; t += 1) {
    if (ended) break
    ys = 0
    lc = 0
    tick = []
    const result = code(api)
    if (tick.length > 0) ticks.push(tick)
    if (result === 0) break
  }
  return ticks
}

describe('zzt-oop 101 runtime execution model', () => {
  // "all code runs automatically from top to bottom, necessitating #END"
  it('#end halts execution — text after #end never runs', () => {
    const ticks = runprogram('First line.\n#end\nSecond line.\n')
    const flat = ticks.flat()
    expect(flat).toContain('text:First line.')
    expect(flat).toContain('end')
    expect(flat).not.toContain('text:Second line.')
  })

  // one move per tick + chaining + a non-movement command ending the chain
  it('runs the canonical chained line one move per tick, then shoots', () => {
    const ticks = runprogram('/s/s/s?e?e/i/i#shoot seek\n')
    expect(ticks).toEqual([
      ['go s'],
      ['go s'],
      ['go s'],
      ['go e'],
      ['go e'],
      ['go i'],
      ['go i'],
      ['shoot seek'],
    ])
  })

  // #IF runs the consequent only when the condition holds
  it('#if runs the consequent only when the condition is true', () => {
    const whenTrue = runprogram('#if blocked n #send :stuck\n#end\n', {
      ifresult: true,
    }).flat()
    expect(whenTrue).toContain('send :stuck')

    const whenFalse = runprogram('#if blocked n #send :stuck\n#end\n', {
      ifresult: false,
    }).flat()
    expect(whenFalse).not.toContain('send :stuck')
    expect(whenFalse).toContain('end')
  })

  // / is #go (blocking): a blocked move retries the same tile on later ticks
  it('/ (blocking) retries while blocked; ? (non-blocking) gives up', () => {
    const blocking = runprogram('/n#char 1\n', {
      blocked: (_a, n) => n <= 2,
    })
    expect(blocking).toEqual([['go n'], ['go n'], ['go n'], ['char 1']])

    const trying = runprogram('?n#char 1\n', { blocked: () => true })
    expect(trying).toEqual([['go n'], ['char 1']])
  })
})
