import { def, exec, shell } from '../helpers'
import type { TaskDef } from '../types'

export const CLI_TASKS: TaskDef[] = [
  def('cli:build', {
    description: 'Compile CLI and refresh oclif manifest',
    run: shell('tsc -p cafecli/tsconfig.json && oclif manifest'),
  }),
  def('cli:build:all', {
    description: 'Production app + CLI build and pack tarballs',
    deps: ['cli:build:all:app', 'cli:build:all:cli', 'cli:build:all:pack'],
    run: { kind: 'tasks' },
  }),
  def('cli:build:all:app', {
    description: 'Production app build for CLI pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['app:build'],
    run: { kind: 'tasks' },
  }),
  def('cli:build:all:cli', {
    description: 'Production CLI build for pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['cli:build'],
    run: { kind: 'tasks' },
  }),
  def('cli:build:all:pack', {
    description: 'oclif pack tarballs (internal)',
    run: exec(['oclif', 'pack', 'tarballs']),
  }),
  def('cli:build:linux', {
    description: 'Production builds and pack linux-x64 tarball',
    deps: [
      'cli:build:linux:app',
      'cli:build:linux:cli',
      'cli:build:linux:pack',
    ],
    run: { kind: 'tasks' },
  }),
  def('cli:build:linux:app', {
    description: 'Production app build for linux pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['app:build'],
    run: { kind: 'tasks' },
  }),
  def('cli:build:linux:cli', {
    description: 'Production CLI build for linux pack (internal)',
    env: { NODE_ENV: 'production' },
    deps: ['cli:build'],
    run: { kind: 'tasks' },
  }),
  def('cli:build:linux:pack', {
    description: 'oclif pack linux-x64 tarball (internal)',
    run: exec(['oclif', 'pack', 'tarballs', '-t', 'linux-x64']),
  }),
]
