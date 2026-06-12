import { def, shell } from '../helpers'
import type { TaskDef } from '../types'

export const WANIX_TASKS: TaskDef[] = [
  def('wanix:ensure', {
    description: 'Ensure wanix bundle artifacts are present',
    run: shell('sh scripts/wanix-ensure.sh'),
  }),
]
