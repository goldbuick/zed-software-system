import { def, shell } from '../../helpers'
import type { TaskDef } from '../../types'

export const OPS_CI_TASKS: TaskDef[] = [
  def('ops:ci:pages:copy-404', {
    description: 'Copy GitHub Pages 404.html into cafe/dist',
    tags: ['ci'],
    run: shell('cp .github/404.html ./cafe/dist'),
  }),
  def('ops:ci:pages:copy-cname', {
    description:
      'Copy GitHub Pages CNAME into cafe/dist and write .nojekyll (skip Jekyll; required for Vite _commonjsHelpers chunks)',
    tags: ['ci'],
    run: shell('cp .github/CNAME ./cafe/dist && touch ./cafe/dist/.nojekyll'),
  }),
]
