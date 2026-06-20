import { def, jestexec } from '../helpers'
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
]
