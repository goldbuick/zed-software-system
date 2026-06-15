import { def, shell } from '../helpers'
import type { TaskDef } from '../types'

export const WANIX_TASKS: TaskDef[] = [
  def('wanix:ensure', {
    description: 'Vend wanix browser runtime into cafe/public/wanix',
    run: shell('sh scripts/wanix-ensure.sh'),
  }),
]
