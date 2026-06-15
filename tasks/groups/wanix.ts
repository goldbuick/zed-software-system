import { def, exec, shell, tasksonly } from '../helpers'
import type { TaskDef } from '../types'

export const WANIX_TASKS: TaskDef[] = [
  def('wanix:ensure', {
    description: 'Vend wanix browser runtime into cafe/public/wanix',
    run: shell('sh scripts/wanix-ensure.sh'),
  }),
  def('wanix:wasm:build', {
    description:
      'Compile fixtures/wanix/*.wat to .wasm via wabt (yarn install provides wat2wasm)',
    run: shell('sh fixtures/wanix/build-wasm.sh'),
  }),
  def('wanix:wasm:build:c', {
    description:
      'Compile fixtures/wanix/*.c to .wasm when wasi-sdk is installed (skips if missing)',
    run: shell('sh fixtures/wanix/build-wasm-c.sh'),
  }),
  tasksonly(
    'wanix:wasm:build:all',
    'Compile wanix example .wat and optional .c sources to .wasm',
    ['wanix:wasm:build', 'wanix:wasm:build:c'],
  ),
  def('wanix:stdin:verify', {
    description:
      'Build wanix wasm fixtures and run isolated host stdin e2e (fix loop gate)',
    tags: ['ci'],
    deps: ['wanix:wasm:build'],
    env: { PLAYWRIGHT_INCLUDE_WANIX_E2E: '1' },
    run: exec(['playwright', 'test', 'e2e/wanix-host.spec.ts']),
  }),
]
