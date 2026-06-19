import { def, exec, shell, tasksonly } from '../helpers'
import { shellhandlerwithargs } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

export const WANIX_TASKS: TaskDef[] = [
  def('wanix:ensure', {
    description: 'Vend wanix browser runtime into cafe/public/wanix',
    run: shellhandlerwithargs('tasks/implementations/wanix/wanix-ensure.sh'),
  }),
  def('wanix:wasm:build', {
    description:
      'Compile ops/fixtures/wanix/*.wat to .wasm via wabt (yarn install provides wat2wasm)',
    run: shell('sh ops/fixtures/wanix/build-wasm.sh'),
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
  def('wanix:io:verify', {
    description:
      'Build wanix wasm fixtures and run isolated host term/io e2e (fix loop gate)',
    tags: ['ci'],
    deps: ['wanix:wasm:build'],
    env: { PLAYWRIGHT_INCLUDE_WANIX_E2E: '1' },
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-host.spec.ts',
      '--grep-invert',
      'wanix vm boot',
    ]),
  }),
  def('wanix:vm-prep-smoke', {
    description:
      'Upstream basic-vm.html smoke (CDN archives + wanix.wasm, no ZSS) — prep gate',
    tags: ['slow'],
    deps: ['wanix:ensure'],
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-vm-prep-smoke.spec.ts',
    ]),
  }),
  def('wanix:vm:verify', {
    description:
      'Run gated wanix vm-prep + vm-run host e2e (large CDN downloads; slow)',
    tags: ['slow'],
    env: {
      PLAYWRIGHT_INCLUDE_WANIX_E2E: '1',
      PLAYWRIGHT_INCLUDE_WANIX_VM_E2E: '1',
    },
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-host.spec.ts',
      '--grep',
      'wanix vm boot',
    ]),
  }),
  def('wanix:vm-prep:verify', {
    description:
      'ZSS spawnwanixvmspace prep only — mount ok + v86-vm.wasm (fast gate, ~3 min)',
    tags: ['slow'],
    env: {
      PLAYWRIGHT_INCLUDE_WANIX_E2E: '1',
      PLAYWRIGHT_INCLUDE_WANIX_VM_E2E: '1',
    },
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-host.spec.ts',
      '--grep',
      'vm-prep only',
    ]),
  }),
]
