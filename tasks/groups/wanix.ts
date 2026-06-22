import { def, shell, tasksonly } from '../helpers'
import { shellhandlerwithargs } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

export const WANIX_TASKS: TaskDef[] = [
  def('wanix:ensure', {
    description:
      'Record pinned wanix npm version (runtime loads from jsDelivr CDN)',
    run: shellhandlerwithargs('tasks/implementations/wanix/wanix-ensure.sh'),
  }),
  def('wanix:wasm:build', {
    description:
      'Compile ops/fixtures/wanix/*.wat to .wasm via wabt (yarn install provides wat2wasm)',
    run: shell('sh ops/fixtures/wanix/build-wasm.sh'),
  }),
  def('wanix:gojs:build', {
    description:
      'Build upstream gojscheck.wasm (Go js/wasm) for basic-terminal.html harness',
    run: shell('sh ops/fixtures/wanix/build-gojs.sh'),
  }),
  def('wanix:wasm:build:c', {
    description:
      'Compile ops/fixtures/wanix/*.c to .wasm when wasi-sdk is installed (skips if missing)',
    run: shell('sh ops/fixtures/wanix/build-wasm-c.sh'),
  }),
  tasksonly(
    'wanix:wasm:build:all',
    'Compile wanix example .wat and optional .c sources to .wasm',
    ['wanix:wasm:build', 'wanix:wasm:build:c'],
  ),
]
