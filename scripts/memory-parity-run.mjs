#!/usr/bin/env node
/**
 * Run zss_memory parity fixtures (native + wasm).
 * yarn memory:parity:test
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const MEMORYDIR = path.join(ROOT, 'zss/memory/wasm')
const FIXTUREDIR = path.join(ROOT, 'fixtures/memory/wasm')
const PARITYBIN = path.join(MEMORYDIR, 'zss_memory_parity')
const WASMDIR = path.join(ROOT, 'cafe/public/wasm/memory')
const SRC = path.join(MEMORYDIR, 'zss_memory.cpp')
const NATIVEONLY = process.argv.includes('--native-only')

function buildnative() {
  execFileSync(
    'g++',
    ['-std=c++14', '-O2', '-I', MEMORYDIR, '-DJSON_NOEXCEPTION', '-DZSS_MEMORY_PARITY_MAIN', '-o', PARITYBIN, SRC],
    { stdio: 'inherit' },
  )
}

function runnative() {
  buildnative()
  const out = execFileSync(PARITYBIN, [FIXTUREDIR], { encoding: 'utf8' })
  process.stdout.write(out)
  if (!out.includes('fail=0')) {
    throw new Error('native memory parity failed')
  }
}

async function runwasm() {
  const build = spawnSync('sh', [path.join(MEMORYDIR, 'build-memory.sh')], {
    stdio: 'inherit',
    cwd: ROOT,
  })
  if (build.status !== 0) {
    throw new Error('memory:build failed')
  }
  const jsurl = pathToFileURL(path.join(WASMDIR, 'zss_memory.js')).href
  const create = (await import(jsurl)).default
  const module = await create()
  const init = module.cwrap('zss_memory_init', null, [])
  const runop = module.cwrap('zss_memory_run_op', 'number', ['string', 'string'])
  const freestr = module.cwrap('zss_memory_free_string', null, ['number'])
  const importjson = module.cwrap('zss_memory_import_json', 'number', ['string'])
  const readutf8 = module.UTF8ToString

  const { readdirSync } = await import('node:fs')
  let pass = 0
  let fail = 0
  for (const name of readdirSync(FIXTUREDIR).filter((f) => f.endsWith('.json'))) {
    const fixture = JSON.parse(
      readFileSync(path.join(FIXTUREDIR, name), 'utf8'),
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

buildnative()
runnative()
if (!NATIVEONLY) {
  await runwasm()
  console.log('memory parity ok (native + wasm)')
} else {
  console.log('memory parity ok (native)')
}
