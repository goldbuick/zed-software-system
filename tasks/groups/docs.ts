import { def, exec } from '../helpers'
import type { TaskDef } from '../types'

export const DOCS_TASKS: TaskDef[] = [
  def('docs:check-links', {
    description: 'Check relative links in tracked markdown files',
    tags: ['ci'],
    run: exec(['node', 'scripts/check-doc-links.mjs']),
  }),
]
