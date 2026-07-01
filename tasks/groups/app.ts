import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { checkrg, spawntask } from 'tasks/shellutil'

import { def, exec, handler, shell, tasksonly } from '../helpers'
import type { TaskContext, TaskDef } from '../types'

const CATALOGS = [
  'zss/device/EXPORTED_FUNCTIONS.md',
  'zss/gadget/EXPORTED_FUNCTIONS.md',
  'zss/memory/EXPORTED_FUNCTIONS.md',
  'zss/firmware/EXPORTED_FUNCTIONS.md',
  'zss/feature/EXPORTED_FUNCTIONS.md',
  'zss/feature/lang/EXPORTED_FUNCTIONS.md',
  'zss/mapping/EXPORTED_FUNCTIONS.md',
  'zss/screens/EXPORTED_FUNCTIONS.md',
  'zss/words/EXPORTED_FUNCTIONS.md',
]

const BARREL_FILES = [
  'zss/gadget/data/state.ts',
  'zss/feature/lang/index.ts',
  'zss/feature/synth/index.ts',
  'zss/feature/synth/backend/wasm/index.ts',
  'zss/feature/synth/backend/daisy/index.ts',
  'zss/screens/screenui/component.tsx',
]

function runlintimports(ctx: TaskContext): number {
  let ok = true
  if (
    !checkrg(
      'parent-directory imports (../)',
      'from [\'"][^\'"]*\\.\\./',
      ctx.root,
    )
  ) {
    ok = false
  }
  if (
    !checkrg(
      're-export syntax',
      'export \\{[^}]+\\} from|export \\* from|export type \\{[^}]+\\} from',
      ctx.root,
    )
  ) {
    ok = false
  }
  for (const barrel of BARREL_FILES) {
    if (existsSync(path.join(ctx.root, barrel))) {
      console.log(`FAIL: barrel file still exists: ${barrel}`)
      ok = false
    }
  }
  if (!ok) {
    console.log('')
    console.log(
      'Import hygiene violations found. See .cursor/rules/no-barrels-reexports.mdc and no-parent-imports.mdc',
    )
    return 1
  }
  console.log('Import hygiene OK (zss/ + cafe/)')
  return 0
}

function runapplint(ctx: TaskContext): number {
  const importresult = runlintimports(ctx)
  if (importresult !== 0) {
    return importresult
  }
  return spawntask(
    'sh',
    [
      '-c',
      "depcruise zss/simspace.ts zss/boardrunnerspace.ts zss/sttspace.ts zss/ttsspace.ts --validate --config ops/depcruise.cjs && eslint . --ext ts,tsx --fix --report-unused-disable-directives --max-warnings 0 && eslint 'ops/infra/net-*-worker.js' --fix --report-unused-disable-directives --max-warnings 0 && tsc --noEmit",
    ],
    ctx,
    { inherit: true },
  )
}

function listexports(dir: string): Set<string> {
  const names = new Set<string>()
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') {
        continue
      }
      for (const name of listexports(full)) {
        names.add(name)
      }
      continue
    }
    if (!/\.tsx?$/.test(entry)) {
      continue
    }
    const text = readFileSync(full, 'utf8')
    for (const match of text.matchAll(
      /^export (?:async )?function ([a-z][a-z0-9]*)/gm,
    )) {
      names.add(match[1])
    }
    for (const match of text.matchAll(/^export const ([A-Z_][A-Z0-9_]*) =/gm)) {
      names.add(match[1])
    }
  }
  return names
}

function runauditexportcatalogs(ctx: TaskContext): number {
  const root = ctx.root
  let exitcode = 0
  for (const catalogpath of CATALOGS) {
    const dir = path.dirname(path.join(root, catalogpath))
    const exports = listexports(dir)
    const catalog = readFileSync(path.join(root, catalogpath), 'utf8')
    const missing = [...exports]
      .filter((name) => !catalog.includes(name))
      .sort()
    const stale: string[] = []
    for (const match of catalog.matchAll(
      /`([a-z][a-z0-9]*|[A-Z_][A-Z0-9_]*)`/g,
    )) {
      const name = match[1]
      if (!exports.has(name) && !catalog.includes(`(${name})`)) {
        stale.push(name)
      }
    }
    const uniquestale = [...new Set(stale)].sort()
    console.log(`\n## ${catalogpath}`)
    if (missing.length) {
      exitcode = 1
      console.log(
        `missing from catalog (${missing.length}): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '…' : ''}`,
      )
    } else {
      console.log('missing from catalog: none')
    }
    if (uniquestale.length) {
      console.log(
        `possibly stale in catalog (${uniquestale.length}): ${uniquestale.slice(0, 20).join(', ')}${uniquestale.length > 20 ? '…' : ''}`,
      )
    } else {
      console.log('possibly stale in catalog: none')
    }
  }
  return exitcode
}

export const APP_TASKS: TaskDef[] = [
  def('app:install', {
    description: 'Install yarn dependencies',
    run: exec(['yarn']),
  }),
  def('app:vite:dev', {
    description: 'Start Vite dev server on port 7777',
    tags: ['dev'],
    run: exec(['vite', '--host', '0.0.0.0', '--port', '7777']),
  }),
  tasksonly(
    'app:dev',
    'Install deps and start Vite dev server',
    ['app:install', 'app:vite:dev'],
    {
      tags: ['dev'],
    },
  ),
  tasksonly(
    'app:dev:no-sc',
    'Dev server with play-bus sidechain bypassed',
    ['app:dev'],
    {
      tags: ['dev'],
      env: { ZSS_DAISY_NO_SIDECHAIN: '1' },
    },
  ),
  def('app:build', {
    description: 'Production Vite build',
    tags: ['ci'],
    run: exec(['vite', 'build']),
  }),
  def('app:build:strict', {
    description: 'Typecheck then production Vite build',
    run: shell('tsc && vite build'),
  }),
  def('app:analyze', {
    description: 'Production build with bundle analyzer',
    env: {
      NODE_OPTIONS: '--max-old-space-size=8192',
      ZSS_ANALYZER: '1',
    },
    run: exec(['vite', 'build']),
  }),
  def('app:clear', {
    description: 'Remove build artifacts and Vite cache',
    run: shell(
      'rimraf tmp && rimraf dist && rimraf headless/dist && rimraf cafe/dist && rimraf node_modules/.vite',
    ),
  }),
  def('app:preview', {
    description: 'Preview production build on port 7777',
    tags: ['dev'],
    run: exec(['vite', 'preview', '--host', '0.0.0.0', '--port', '7777']),
  }),
  def('app:lint:imports', {
    description:
      'Guard zss/ and cafe/ for no ../ imports, re-exports, or known barrel files',
    tags: ['ci'],
    run: handler(runlintimports),
  }),
  def('app:lint', {
    description: 'Import guards, dependency-cruiser, ESLint, and tsc --noEmit',
    tags: ['ci'],
    run: handler(runapplint),
  }),
  def('app:test', {
    description: 'Run Jest test suite',
    tags: ['ci'],
    run: exec(['yarn', 'jest', '--config', 'ops/jest.config.ts', '--verbose']),
  }),
  def('app:test:coverage', {
    description: 'Jest with coverage on selected VM/gadget modules',
    run: shell(
      "yarn jest --config ops/jest.config.ts --coverage --collectCoverageFrom='zss/device/vm/gadgetsynctick.ts' --collectCoverageFrom='zss/device/vm/handlers/scroll.ts' --collectCoverageFrom='zss/device/vm/handlers/ticktock.ts' --collectCoverageFrom='zss/device/boardrunner/handlers/linkdead.ts' --collectCoverageFrom='zss/device/gadgetclient.ts'",
    ),
  }),
  def('app:audit:deadcode', {
    description: 'Knip dead-code audit (files, exports, dependencies)',
    run: exec([
      'knip',
      '--include',
      'files,exports,dependencies',
      '--no-exit-code',
    ]),
  }),
  def('app:audit:export-catalogs', {
    description: 'Audit export catalogs',
    run: handler(runauditexportcatalogs),
  }),
  def('app:sloc', {
    description: 'Source lines of code count for zss/',
    run: shell("npx sloc -e .js -e '__tests__|\\.test\\.(ts|tsx)$' zss"),
  }),
  def('app:server:dev:run', {
    description: 'Concurrent Vite dev and zss dev (internal)',
    tags: ['dev'],
    env: { ZSS_NO_HTTPS: '1' },
    run: shell(
      'npx concurrently -k "yarn task run app:vite:dev" "sleep 8 && ./headless/bin/dev.js --dev"',
    ),
  }),
  tasksonly(
    'app:server:dev',
    'CLI build + Vite dev + zss dev server',
    ['cli:build', 'app:server:dev:run'],
    {
      tags: ['dev'],
    },
  ),
  def('app:server:run', {
    description: 'Production build, CLI build, run zss server',
    deps: ['app:build', 'cli:build'],
    tags: ['dev'],
    run: exec(['./headless/bin/dev.js']),
  }),
]
