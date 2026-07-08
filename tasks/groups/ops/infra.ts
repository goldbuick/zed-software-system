import { def, shell } from '../../helpers'
import type { TaskDef } from '../../types'

export const OPS_INFRA_TASKS: TaskDef[] = [
  def('ops:infra:lint', {
    description: 'ESLint Cloudflare worker sources (ops/infra/net-*-worker.js)',
    tags: ['ci'],
    run: shell(
      "eslint 'ops/infra/net-*-worker.js' --fix --report-unused-disable-directives --max-warnings 0",
    ),
  }),
]
