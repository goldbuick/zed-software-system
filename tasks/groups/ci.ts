import { def, shell } from '../helpers'
import type { TaskDef } from '../types'

export const CI_TASKS: TaskDef[] = [
  def('ci:pages:copy-404', {
    description: 'Copy GitHub Pages 404.html into cafe/dist',
    tags: ['ci'],
    run: shell('cp .github/404.html ./cafe/dist'),
  }),
  def('ci:pages:copy-cname', {
    description: 'Copy GitHub Pages CNAME into cafe/dist',
    tags: ['ci'],
    run: shell('cp .github/CNAME ./cafe/dist'),
  }),
]
