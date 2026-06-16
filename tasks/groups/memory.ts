import { def, exec, jestexec, shell } from '../helpers'
import { nodehandler, tsxhandler } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

export const MEMORY_TASKS: TaskDef[] = [
  def('memory:build', {
    description: 'Build memory WASM via emscripten',
    run: shell('sh zss/memory/wasm/build-memory.sh'),
  }),
  def('memory:parity:test', {
    description: 'Memory wasm parity test suite',
    run: nodehandler('tasks/implementations/memory/memory-parity-run.mjs'),
  }),
  def('memory:test:native', {
    description: 'Memory parity native-only run',
    run: nodehandler('tasks/implementations/memory/memory-parity-run.mjs', [
      '--native-only',
    ]),
  }),
  def('memory:parity:regen', {
    description: 'Regenerate memory parity fixtures',
    env: { REGEN_MEMORY_FIXTURES: '1' },
    run: jestexec(
      'ops/tests/unit/memory/wasm/__tests__/regenfixtures.test.ts',
      [
        '--runTestsByPath',
        '--testPathIgnorePatterns=/ops/e2e/',
        '--no-coverage',
      ],
    ),
  }),
  def('memory:parity:check-coverage', {
    description: 'Check memory parity fixture coverage',
    run: nodehandler(
      'tasks/implementations/memory/memory-parity-check-coverage.mjs',
    ),
  }),
  def('memory:repro:build', {
    description: 'Build host memory corruption repro bundle',
    run: tsxhandler('tasks/implementations/memory/build-host-memory-repro.ts'),
  }),
]
