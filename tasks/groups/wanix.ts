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
  def('wanix:zed-cafe:build', {
    description:
      'Build zed-cafe.wasm (Go js/wasm) into cafe/public/wanix/ for prod',
    tags: ['ci'],
    run: shell('sh ops/fixtures/wanix/build-zed-cafe.sh'),
  }),
  def('wanix:zed-cafe:export:validate', {
    description:
      'Headed Playwright: minimal zed-cafe-export harness must show export/manifest.json (local gate, not CI)',
    run: shell('node tasks/implementations/wanix/validate-zed-cafe-export.mjs'),
  }),
  def('wanix:zed-cafe:export:validate:app', {
    description:
      'Headed Playwright: full app #wanix vm → cat /zed-cafe/manifest.json (local gate, not CI)',
    run: shell(
      'node tasks/implementations/wanix/validate-zed-cafe-export-app.mjs',
    ),
  }),
  def('wanix:zed-cafe:task-read:validate', {
    description:
      'Headed Playwright: zed-cafe-task-read harness — dropped WASI task reads zed-cafe/manifest.json (local gate, not CI)',
    run: shell(
      'node tasks/implementations/wanix/validate-zed-cafe-task-read.mjs',
    ),
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
