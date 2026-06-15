import { def, exec } from '../helpers'
import type { TaskDef } from '../types'

export const CONTENT_TASKS: TaskDef[] = [
  def('content:book:build', {
    description:
      'Build importable book JSON from template path (pass path as extra args)',
    run: exec(['node', 'scripts/content-cli.mjs', 'build']),
  }),
  def('content:book:validate', {
    description: 'Validate book JSON (pass path as extra args)',
    run: exec(['node', 'scripts/content-cli.mjs', 'validate']),
  }),
  def('content:book:test', {
    description: 'Jest content book tests',
    tags: ['ci'],
    run: exec([
      'yarn',
      'jest',
      'zss/feature/content/__tests__/contentbook.test.ts',
      '--no-coverage',
    ]),
  }),
  def('content:codepage:validate', {
    description: 'Validate codepage JSON (pass path as extra args)',
    run: exec(['node', 'scripts/content-cli.mjs', 'codepage-validate']),
  }),
]
