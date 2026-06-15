import { def, exec, shell, tasksonly } from '../helpers'
import { nodehandler } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

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
    'Install deps and start Vite dev server (WASM lang)',
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
  tasksonly(
    'app:tslang:dev',
    'Dev server using TS compiler for chip scripts',
    ['app:install', 'app:vite:dev'],
    {
      tags: ['dev'],
      env: { ZSS_WASM_SCRIPT: 'false' },
    },
  ),
  tasksonly(
    'app:wasm:dev',
    'Rebuild lang WASM then start dev server',
    ['lang:build', 'app:dev'],
    {
      tags: ['dev'],
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
  def('app:lint', {
    description: 'Dependency-cruiser, ESLint, and tsc --noEmit',
    tags: ['ci'],
    run: shell(
      'depcruise zss/simspace.ts zss/heavyspace.ts zss/boardrunnerspace.ts zss/sttspace.ts --validate --config .dependency-cruiser.cjs && eslint . --ext ts,tsx --fix --report-unused-disable-directives --max-warnings 0 && tsc --noEmit',
    ),
  }),
  def('app:test', {
    description: 'Run Jest test suite',
    tags: ['ci'],
    run: exec(['yarn', 'jest', '--verbose']),
  }),
  def('app:test:coverage', {
    description: 'Jest with coverage on selected VM/gadget modules',
    run: shell(
      "yarn jest --coverage --collectCoverageFrom='zss/device/vm/gadgetsynctick.ts' --collectCoverageFrom='zss/device/vm/handlers/scroll.ts' --collectCoverageFrom='zss/device/vm/handlers/ticktock.ts' --collectCoverageFrom='zss/device/boardrunner/handlers/linkdead.ts' --collectCoverageFrom='zss/device/gadgetclient.ts'",
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
    run: nodehandler('tasks/implementations/app/audit-export-catalogs.mjs'),
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
