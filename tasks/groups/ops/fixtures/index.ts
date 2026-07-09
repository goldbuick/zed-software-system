import { OPS_FIXTURES_CONTENT_TASKS } from './content'
import { OPS_FIXTURES_LANG_TASKS } from './lang'
import { OPS_FIXTURES_MEMORY_TASKS } from './memory'
import { OPS_FIXTURES_SYNTH_TASKS } from './synth'
import { OPS_FIXTURES_WANIX_TASKS } from './wanix'
import { OPS_FIXTURES_ZZT_TASKS } from './zzt'
import type { TaskDef } from '../../../types'

export const OPS_FIXTURES_TASKS: TaskDef[] = [
  ...OPS_FIXTURES_CONTENT_TASKS,
  ...OPS_FIXTURES_ZZT_TASKS,
  ...OPS_FIXTURES_WANIX_TASKS,
  ...OPS_FIXTURES_LANG_TASKS,
  ...OPS_FIXTURES_MEMORY_TASKS,
  ...OPS_FIXTURES_SYNTH_TASKS,
]
