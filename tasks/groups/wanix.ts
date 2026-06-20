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
  def('wanix:vm-simple-smoke', {
    description:
      'Upstream basic-vm.html port (vm-simple.html) — visible wanix-term, login/id, no panic',
    tags: ['slow'],
    deps: ['wanix:ensure'],
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-vm-simple.spec.ts',
    ]),
  }),
  def('wanix:vm-simple-deferred-smoke', {
    description:
      'Deferred wanix-term connect (vm-simple-deferred.html) — term timing bisect',
    tags: ['slow'],
    deps: ['wanix:ensure'],
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-vm-simple-deferred.spec.ts',
    ]),
  }),
  def('wanix:vm-term-smoke', {
    description:
      'vm-simple.html + probe harness — login/id via __WANIX_TERM_PROBE__',
    tags: ['slow'],
    deps: ['wanix:ensure'],
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-vm-term-smoke.spec.ts',
    ]),
  }),
  def('wanix:vm-term-iframe-smoke', {
    description:
      'wanix-term inside hidden iframe under mock WebGL parent — login/id',
    tags: ['slow'],
    deps: ['wanix:ensure'],
    run: exec([
      'playwright',
      'test',
      '--config',
      'ops/playwright.config.ts',
      'ops/e2e/wanix-vm-term-iframe-smoke.spec.ts',
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
  def('wanix:vm:isolated:verify', {
    description:
      'Isolated wanix-vm-e2e.html term stress (gojs load order, no R3F)',
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
      'ops/e2e/wanix-vm-app.spec.ts',
      '--grep',
      'isolated wanix-vm-e2e',
    ]),
  }),
  def('wanix:vm:app:verify', {
    description:
      'Full ZSS app VM gate — spawn panic check + uname --help/id term stress (matches manual /?)',
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
      'ops/e2e/wanix-vm-app.spec.ts',
      '--grep',
      'full ZSS app',
    ]),
  }),
  def('wanix:vm:fixloop', {
    description:
      'Automated fix loop: upstream smoke + isolated + full-app VM gates (stop app dev first; ~15–25 min)',
    tags: ['slow'],
    deps: ['wanix:ensure'],
    run: shell('sh tasks/implementations/wanix/vm-fixloop.sh'),
  }),
]
