import { def, exec } from '../helpers'
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
    run: exec([
      'yarn',
      'jest',
      'zss/feature/content/__tests__/contentbook.test.ts',
      '--no-coverage',
    ]),
  }),
  def('content:codepage:validate', {
    description: 'Validate codepage JSON (pass path as extra args)',
    run: nodehandler(CONTENT, ['codepage-validate']),
  }),
]
