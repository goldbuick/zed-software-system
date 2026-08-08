import { tasksonly } from '../../helpers'
import type { TaskDef } from '../../types'

export const OPS_BUILD_TASKS: TaskDef[] = [
  tasksonly(
    'ops:build',
    'Build ops native artifacts (daisy) and regen committed fixtures',
    [
      'ops:daisy:build',
      'ops:fixtures:content:book:build:all',
      'ops:fixtures:synth:regen:all',
    ],
    { tags: ['slow'] },
  ),
]
