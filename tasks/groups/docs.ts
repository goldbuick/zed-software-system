import { def } from '../helpers'
import { nodehandler } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

export const DOCS_TASKS: TaskDef[] = [
  def('docs:check-links', {
    description: 'Check relative links in tracked markdown files',
    tags: ['ci'],
    run: nodehandler('tasks/implementations/docs/check-doc-links.mjs'),
  }),
]
