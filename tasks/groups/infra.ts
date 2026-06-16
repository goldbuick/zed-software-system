import { def, shell } from '../helpers'
import type { TaskDef } from '../types'

export const INFRA_TASKS: TaskDef[] = [
  def('infra:lint', {
    description: 'ESLint Cloudflare worker sources (ops/infra/net-*-worker.js)',
    tags: ['ci'],
    run: shell(
      "eslint 'ops/infra/net-*-worker.js' --fix --report-unused-disable-directives --max-warnings 0",
    ),
  }),
]
