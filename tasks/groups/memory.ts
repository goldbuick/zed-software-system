import { def, exec, shell } from '../helpers'
import type { TaskDef } from '../types'

export const MEMORY_TASKS: TaskDef[] = [
  def('memory:build', {
    description: 'Build memory WASM via emscripten',
    run: shell('sh zss/memory/wasm/build-memory.sh'),
  }),
  def('memory:parity:test', {
    description: 'Memory wasm parity test suite',
    run: exec(['node', 'scripts/memory-parity-run.mjs']),
  }),
  def('memory:test:native', {
    description: 'Memory parity native-only run',
    run: exec(['node', 'scripts/memory-parity-run.mjs', '--native-only']),
  }),
  def('memory:parity:regen', {
    description: 'Regenerate memory parity fixtures',
    env: { REGEN_MEMORY_FIXTURES: '1' },
    run: exec([
      'yarn',
      'jest',
      '--runTestsByPath',
      'zss/memory/wasm/regenfixtures.test.ts',
      '--testPathIgnorePatterns=/e2e/',
      '--no-coverage',
    ]),
  }),
  def('memory:parity:check-coverage', {
    description: 'Check memory parity fixture coverage',
    run: exec(['node', 'scripts/memory-parity-check-coverage.mjs']),
  }),
  def('memory:repro:build', {
    description: 'Build host memory corruption repro bundle',
    run: exec(['npx', 'tsx', 'scripts/build-host-memory-repro.ts']),
  }),
]
