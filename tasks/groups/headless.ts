import { def, exec, shell, tasksonly } from '../helpers'
import type { TaskDef } from '../types'

export const HEADLESS_TASKS: TaskDef[] = [
  def('headless:build', {
    description: 'Compile CLI and refresh oclif manifest',
    run: shell('tsc -p headless/tsconfig.json && oclif manifest'),
  }),
  def('headless:build:all', {
    description: 'Production app + CLI build and pack tarballs',
    deps: ['headless:build:all:app', 'headless:build:all:cli', 'headless:build:all:pack'],
    run: { kind: 'tasks' },
  }),
  def('headless:build:all:app', {
    description: 'Production app build for CLI pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['cafe:build'],
    run: { kind: 'tasks' },
  }),
  def('headless:build:all:cli', {
    description: 'Production CLI build for pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['headless:build'],
    run: { kind: 'tasks' },
  }),
  def('headless:build:all:pack', {
    description: 'oclif pack tarballs (internal)',
    run: exec(['oclif', 'pack', 'tarballs']),
  }),
  def('headless:build:linux', {
    description: 'Production builds and pack linux-x64 tarball',
    deps: [
      'headless:build:linux:app',
      'headless:build:linux:cli',
      'headless:build:linux:pack',
    ],
    run: { kind: 'tasks' },
  }),
  def('headless:build:linux:app', {
    description: 'Production app build for linux pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['cafe:build'],
    run: { kind: 'tasks' },
  }),
  def('headless:build:linux:cli', {
    description: 'Production CLI build for linux pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['headless:build'],
    run: { kind: 'tasks' },
  }),
  def('headless:build:linux:pack', {
    description: 'oclif pack linux-x64 tarball (internal)',
    run: exec(['oclif', 'pack', 'tarballs', '-t', 'linux-x64']),
  }),
  def('headless:server:dev:run', {
    description: 'Concurrent Vite dev and zss dev (internal)',
    tags: ['dev'],
    env: { ZSS_NO_HTTPS: '1' },
    run: shell(
      'npx concurrently -k "yarn task run cafe:vite:dev" "sleep 8 && ./headless/bin/dev.js --dev"',
    ),
  }),
  tasksonly(
    'headless:server:dev',
    'CLI build + Vite dev + zss dev server',
    ['headless:build', 'headless:server:dev:run'],
    {
      tags: ['dev'],
    },
  ),
  def('headless:server:run', {
    description: 'Production build, CLI build, run zss server',
    deps: ['cafe:build', 'headless:build'],
    tags: ['dev'],
    run: exec(['./headless/bin/dev.js']),
  }),
]