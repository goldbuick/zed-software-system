import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

import { def, exec, handler, jestexec, shell } from '../helpers'
import type { TaskContext, TaskDef } from '../types'

const MEMORYDIR = 'zss/memory/wasm'
const FIXTUREDIR = 'ops/fixtures/memory/wasm'
const REGEN = 'ops/tests/unit/memory/wasm/regenfixtures.test.ts'
const EXCLUDED = new Set(['adminconfig.test.ts'])

function buildnative(root: string) {
  const memorydir = path.join(root, MEMORYDIR)
  const paritybin = path.join(memorydir, 'zss_memory_parity')
  const src = path.join(memorydir, 'zss_memory.cpp')
  execFileSync(
    'g++',
    [
      '-std=c++14',
      '-O2',
      '-I',
      memorydir,
      '-DJSON_NOEXCEPTION',
      '-DZSS_MEMORY_PARITY_MAIN',
      '-o',
      paritybin,
      src,
    ],
    { stdio: 'inherit' },
  )
}

function runnative(root: string) {
  const memorydir = path.join(root, MEMORYDIR)
  const paritybin = path.join(memorydir, 'zss_memory_parity')
  const fixturedir = path.join(root, FIXTUREDIR)
  buildnative(root)
  const out = execFileSync(paritybin, [fixturedir], { encoding: 'utf8' })
  process.stdout.write(out)
  if (!out.includes('fail=0')) {
    throw new Error('native memory parity failed')
  }
}

async function runwasm(root: string) {
  const memorydir = path.join(root, MEMORYDIR)
  const wasmdir = path.join(root, 'cafe/public/wasm/memory')
  const fixturedir = path.join(root, FIXTUREDIR)
  const build = spawnSync('sh', [path.join(memorydir, 'build-memory.sh')], {
    stdio: 'inherit',
    cwd: root,
  })
  if (build.status !== 0) {
    throw new Error('memory:build failed')
  }
  const jsurl = pathToFileURL(path.join(wasmdir, 'zss_memory.js')).href
  const create = (await import(jsurl)).default
  const module = await create()
  const init = module.cwrap('zss_memory_init', null, [])
  const runop = module.cwrap('zss_memory_run_op', 'number', [
    'string',
    'string',
  ])
  const freestr = module.cwrap('zss_memory_free_string', null, ['number'])
  const importjson = module.cwrap('zss_memory_import_json', 'number', [
    'string',
  ])
  const readutf8 = module.UTF8ToString

  let pass = 0
  let fail = 0
  for (const name of readdirSync(fixturedir).filter((f) =>
    f.endsWith('.json'),
  )) {
    const fixture = JSON.parse(
      readFileSync(path.join(fixturedir, name), 'utf8'),
    )
    init()
    if (fixture.initial?.root) {
      if (importjson(JSON.stringify(fixture.initial)) !== 0) {
        console.log(`${name}: FAIL initial import`)
        ++fail
        continue
      }
    }
    let ok = true
    for (let i = 0; i < fixture.steps.length; ++i) {
      const step = fixture.steps[i]
      const argsjson = JSON.stringify(step.args ?? {})
      const outptr = runop(step.op, argsjson)
      if (!outptr) {
        console.log(`${name} step ${i} (${step.op}): FAIL op error`)
        ok = false
        break
      }
      const actual = JSON.parse(readutf8(outptr))
      freestr(outptr)
      const expect = step.expect
      if (expect.mode === 'string') {
        if (actual !== expect.string) {
          ok = false
          break
        }
        continue
      }
      if (expect.mode === 'bool') {
        if (actual !== expect.value) {
          ok = false
          break
        }
        continue
      }
      if (expect.mode === 'approx_json') {
        const epsilon = expect.epsilon ?? 0.01
        for (const key of Object.keys(expect.json)) {
          const a = actual[key]
          const e = expect.json[key]
          if (typeof a === 'number' && typeof e === 'number') {
            if (Math.abs(a - e) > epsilon) {
              ok = false
              break
            }
          } else if (!isDeepStrictEqual(a, e)) {
            ok = false
            break
          }
        }
        if (!ok) {
          console.log(`${name} step ${i} (${step.op}): FAIL`)
          console.log(' expected:', JSON.stringify(expect.json))
          console.log(' actual:', JSON.stringify(actual))
          break
        }
        continue
      }
      if (!isDeepStrictEqual(actual, expect.json)) {
        console.log(`${name} step ${i} (${step.op}): FAIL`)
        console.log(' expected:', JSON.stringify(expect.json))
        console.log(' actual:', JSON.stringify(actual))
        ok = false
        break
      }
    }
    if (ok) {
      console.log(`${name}: PASS`)
      ++pass
    } else {
      ++fail
    }
  }
  console.log(`wasm pass=${pass} fail=${fail}`)
  if (fail > 0) {
    throw new Error('wasm memory parity failed')
  }
}

async function runmemoryparity(ctx: TaskContext): Promise<number> {
  const nativeonly = ctx.args.includes('--native-only')
  runnative(ctx.root)
  if (!nativeonly) {
    await runwasm(ctx.root)
    console.log('memory parity ok (native + wasm)')
  } else {
    console.log('memory parity ok (native)')
  }
  return 0
}

function parsemanifest(root: string) {
  const regenpath = path.join(root, REGEN)
  const src = readFileSync(regenpath, 'utf8')
  const start = src.indexOf('export const FIXTURE_MANIFEST')
  if (start < 0) {
    throw new Error('FIXTURE_MANIFEST not found in regenfixtures.test.ts')
  }
  const brace = src.indexOf('{', start)
  let depth = 0
  let end = brace
  for (; end < src.length; ++end) {
    const ch = src[end]
    if (ch === '{') {
      ++depth
    } else if (ch === '}') {
      --depth
      if (depth === 0) {
        break
      }
    }
  }
  const literal = src.slice(brace, end + 1)

  return Function(`return (${literal})`)() as Record<string, string[]>
}

function runmemoryparitycoverage(ctx: TaskContext): number {
  const root = ctx.root
  const fixturedir = path.join(root, FIXTUREDIR)
  if (!existsSync(fixturedir)) {
    console.error('fixture dir missing; run yarn memory:parity:regen first')
    return 1
  }

  const manifest = parsemanifest(root)
  const testdir = path.join(root, 'ops/tests/unit/memory')
  const testfiles = readdirSync(testdir)
    .filter((f) => f.endsWith('.test.ts'))
    .sort()
  const inscope = testfiles.filter((f) => !EXCLUDED.has(f))
  const manifestkeys = Object.keys(manifest).sort()

  let failed = false

  for (const file of inscope) {
    if (!manifest[file]) {
      console.error(`missing manifest entry for ${file}`)
      failed = true
    }
  }

  for (const file of manifestkeys) {
    if (EXCLUDED.has(file)) {
      console.error(`manifest should not include excluded ${file}`)
      failed = true
      continue
    }
    if (!testfiles.includes(file)) {
      console.error(`manifest references unknown test file ${file}`)
      failed = true
    }
  }

  const allfixtures = Object.values(manifest).flat()
  const ondisk = readdirSync(fixturedir).filter((f) => f.endsWith('.json'))
  const expectednames = new Set(allfixtures.map((n) => `${n}.json`))

  for (const name of allfixtures) {
    const file = `${name}.json`
    if (!ondisk.includes(file)) {
      console.error(`fixture missing on disk: ${file}`)
      failed = true
    }
  }

  for (const file of ondisk) {
    if (!expectednames.has(file)) {
      console.error(`orphan fixture not in manifest: ${file}`)
      failed = true
    }
  }

  if (failed) {
    return 1
  }

  console.log(
    `memory parity coverage ok: ${inscope.length} test files, ${allfixtures.length} fixtures`,
  )
  return 0
}

export const MEMORY_TASKS: TaskDef[] = [
  def('memory:build', {
    description: 'Build memory WASM via emscripten',
    run: shell('sh zss/memory/wasm/build-memory.sh'),
  }),
  def('memory:parity:test', {
    description: 'Memory wasm parity test suite',
    run: handler(runmemoryparity),
  }),
  def('memory:test:native', {
    description: 'Memory parity native-only run',
    run: handler((ctx) =>
      runmemoryparity({ ...ctx, args: ['--native-only', ...ctx.args] }),
    ),
  }),
  def('memory:parity:regen', {
    description: 'Regenerate memory parity fixtures',
    env: { REGEN_MEMORY_FIXTURES: '1' },
    run: jestexec('ops/tests/unit/memory/wasm/regenfixtures.test.ts', [
      '--runTestsByPath',
      '--no-coverage',
    ]),
  }),
  def('memory:parity:check-coverage', {
    description: 'Check memory parity fixture coverage',
    run: handler(runmemoryparitycoverage),
  }),
]
