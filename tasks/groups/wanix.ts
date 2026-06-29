import { def, shell, tasksonly } from '../helpers'
import { shellhandlerwithargs } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

export const WANIX_TASKS: TaskDef[] = [
  def('wanix:bridge', {
    description:
      'Run wanix-bridge for WebSocket 9P export (HTTPS dev: wss URLs via Vite proxy)',
    tags: ['dev'],
    run: shell('sh tasks/implementations/wanix/run-wanix-bridge.sh'),
  }),
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
      'Build upstream gojscheck.wasm (Go js/wasm) for terminal smoke tests',
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
      'Headed Playwright: full app #wanix vm → cat /zed-cafe/stats.json (local gate, not CI)',
    run: shell(
      'node tasks/implementations/wanix/validate-zed-cafe-export-app.mjs',
    ),
  }),
  def('wanix:zed-cafe:memfs:validate', {
    description:
      'Composite ExportFS rollout gate — build, go test, headed app Playwright, jest smoke',
    run: shell('node tasks/implementations/wanix/validate-zed-cafe-memfs.mjs'),
  }),
  def('wanix:zed-cafe:task-read:validate', {
    description:
      'Headed Playwright: full app drop zedcaferead.wasm reads zed-cafe/stats.json (local gate, not CI)',
    run: shell(
      'node tasks/implementations/wanix/validate-zed-cafe-task-read-app.mjs',
    ),
  }),
  def('wanix:zed-cafe:duplex:validate', {
    description:
      'Headed Playwright: full app drop zedcafewrite.wasm + #wanix pull import (local gate, not CI)',
    run: shell(
      'node tasks/implementations/wanix/validate-zed-cafe-duplex-app.mjs',
    ),
  }),
  def('wanix:vm:boot:validate', {
    description:
      'Headed Playwright: seeded book + #wanix vm must reach shell and /zed-cafe/stats.json (local gate, not CI)',
    run: shell('node tasks/implementations/wanix/validate-wanix-vm-boot.mjs'),
  }),
  def('wanix:vm:zed-cafe:validate', {
    description:
      'Headed Playwright: #wanix vm → ls / shows zed-cafe, cat stats.json (primary local gate, not CI)',
    run: shell(
      'node tasks/implementations/wanix/validate-wanix-vm-zedcafe.mjs',
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
