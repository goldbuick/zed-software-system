import { def, exec } from '../helpers'
import type { TaskDef } from '../types'

export const E2E_TASKS: TaskDef[] = [
  def('e2e:install', {
    description: 'Install Playwright browsers (chromium, firefox, webkit)',
    run: exec(['playwright', 'install', 'chromium', 'firefox', 'webkit']),
  }),
  def('e2e:test', {
    description: 'Run Playwright e2e tests',
    tags: ['ci'],
    run: exec(['playwright', 'test']),
  }),
  def('e2e:test:ui', {
    description: 'Run Playwright with UI mode',
    tags: ['dev'],
    run: exec(['playwright', 'test', '--ui']),
  }),
  def('e2e:test:all-browsers', {
    description: 'Run Playwright on all browsers',
    env: { PLAYWRIGHT_ALL_BROWSERS: '1' },
    run: exec(['playwright', 'test']),
  }),
  def('e2e:test:gadget-scroll', {
    description: 'Gadget inspect scroll e2e',
    env: { PLAYWRIGHT_INCLUDE_GADGET_E2E: '1' },
    run: exec(['playwright', 'test', 'e2e/gadget-inspect-scroll.spec.ts']),
  }),
  def('e2e:test:join-gadget-charedit', {
    description: 'Join gadget charedit e2e',
    env: { PLAYWRIGHT_INCLUDE_JOIN_E2E: '1' },
    run: exec(['playwright', 'test', 'e2e/join-gadget-charedit.spec.ts']),
  }),
  def('e2e:test:join-move', {
    description: 'Join boardrunner move e2e',
    env: { PLAYWRIGHT_INCLUDE_JOIN_E2E: '1' },
    run: exec(['playwright', 'test', 'e2e/join-boardrunner-move.spec.ts']),
  }),
  def('e2e:join-move:loop', {
    description: 'Repeated join-move e2e loop',
    run: exec(['npx', 'tsx', 'scripts/run-join-move-loop.ts']),
  }),
  def('e2e:test:lang-bench', {
    description: 'Lang compile bench e2e',
    env: { PLAYWRIGHT_INCLUDE_LANG_BENCH: '1' },
    run: exec(['playwright', 'test', 'e2e/lang-compile-bench.spec.ts']),
  }),
  def('e2e:test:wanix', {
    description: 'Wanix host and CLI e2e',
    env: { PLAYWRIGHT_INCLUDE_WANIX_E2E: '1' },
    run: exec([
      'playwright',
      'test',
      'e2e/wanix-host.spec.ts',
      'e2e/wanix-cli.spec.ts',
    ]),
  }),
  def('e2e:manual:join-charedit', {
    description: 'Manual headed join charedit debug session',
    env: {
      PLAYWRIGHT_INCLUDE_JOIN_E2E: '1',
      PLAYWRIGHT_MANUAL_JOIN_CHAREDIT: '1',
    },
    run: exec([
      'playwright',
      'test',
      'e2e/join-charedit-manual.spec.ts',
      '--headed',
      '--debug',
    ]),
  }),
]
