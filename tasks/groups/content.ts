import { spawnSync } from 'node:child_process'

import { def, handler, jestexec } from '../helpers'
import { nodehandler, tsxhandler } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

const CONTENT = 'tasks/implementations/content/content-cli.mjs'

export const CONTENT_TASKS: TaskDef[] = [
  def('content:book:build', {
    description:
      'Build importable book JSON from template path (pass path as extra args)',
    run: nodehandler(CONTENT, ['build']),
  }),
  def('content:book:validate', {
    description: 'Validate book JSON (pass path as extra args)',
    run: nodehandler(CONTENT, ['validate']),
  }),
  def('content:book:test', {
    description: 'Jest content book tests',
    tags: ['ci'],
    run: jestexec(
      'ops/tests/unit/feature/content/__tests__/contentbook.test.ts',
      ['--no-coverage'],
    ),
  }),
  def('content:codepage:validate', {
    description: 'Validate codepage JSON (pass path as extra args)',
    run: nodehandler(CONTENT, ['codepage-validate']),
  }),
  def('content:zzt:corpus:sync', {
    description:
      'Crawl Museum of ZZT and download vanilla ZZT world ZIPs into ops/fixtures/zzt/corpus/archives (gitignored)',
    tags: ['slow'],
    run: tsxhandler('tasks/implementations/content/museum-zzt-corpus-sync.ts'),
  }),
  def('content:zzt:corpus:manifest', {
    description:
      'Crawl Museum of ZZT and write vanilla ZZT manifest only (no downloads)',
    run: tsxhandler('tasks/implementations/content/museum-zzt-corpus-sync.ts', [
      'manifest',
    ]),
  }),
  def('content:zzt:corpus:extract', {
    description:
      'Unzip vanilla ZZT archives into ops/fixtures/zzt/corpus/extracted (.zzt/.brd only)',
    tags: ['slow'],
    run: tsxhandler(
      'tasks/implementations/content/museum-zzt-corpus-extract.ts',
      ['extract'],
    ),
  }),
  def('content:zzt:corpus:zss', {
    description:
      'Convert extracted ZZT/BRD OOP into ops/fixtures/zzt/corpus/zss/*.zss + manifest',
    tags: ['slow'],
    run: tsxhandler(
      'tasks/implementations/content/museum-zzt-corpus-extract.ts',
      ['zss'],
    ),
  }),
  def('content:zzt:corpus:build', {
    description:
      'Extract Museum archives, build ZZT OOP → .zss corpus, and sanitize profanity/slurs',
    tags: ['slow'],
    deps: ['content:zzt:corpus:extract', 'content:zzt:corpus:zss', 'content:zzt:corpus:sanitize'],
    run: { kind: 'tasks' },
  }),
  def('content:zzt:corpus:profanity:scan', {
    description:
      'Scan ops/fixtures/zzt/corpus/zss for profanity and slurs; write profanity-report.json',
    tags: ['slow'],
    run: tsxhandler('tasks/implementations/content/zzt-corpus-profanity.ts', [
      'scan',
    ]),
  }),
  def('content:zzt:corpus:profanity:verify', {
    description:
      'Fail if corpus zss still contains profanity or slurs (CI gate)',
    tags: ['ci', 'slow'],
    run: tsxhandler('tasks/implementations/content/zzt-corpus-profanity.ts', [
      'scan',
      'verify',
    ]),
  }),
  def('content:zzt:corpus:sanitize', {
    description:
      'Redact profanity and racial slurs in ops/fixtures/zzt/corpus/zss/*.zss',
    tags: ['slow'],
    run: tsxhandler('tasks/implementations/content/zzt-corpus-profanity.ts', [
      'sanitize',
    ]),
  }),
  def('content:zzt:corpus:screenshots', {
    description:
      'Render board PNGs from extracted ZZT/BRD into ops/fixtures/zzt/corpus/screenshots (gitignored)',
    tags: ['slow'],
    run: handler((ctx) => {
      const result = spawnSync(
        'yarn',
        [
          'jest',
          '--config',
          'ops/jest.config.ts',
          '--runTestsByPath',
          'ops/tests/integration/zzt/corpus-screenshots.test.ts',
          '--no-coverage',
        ],
        {
          cwd: ctx.root,
          stdio: 'inherit',
          env: {
            ...ctx.env,
            ZSS_TASK_ARGS: ctx.args.join(' '),
          },
          shell: false,
        },
      )
      return result.status ?? 1
    }),
  }),
]
