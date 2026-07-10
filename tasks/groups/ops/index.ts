import type { TaskDef } from '../../types'

import { OPS_BUILD_TASKS } from './build'
import { OPS_CI_TASKS } from './ci'
import { OPS_DAISY_TASKS } from './daisy'
import { OPS_DEPLOY_TASKS } from './deploy'
import { OPS_DOCS_TASKS } from './docs'
import { OPS_FIXTURES_TASKS } from './fixtures'
import { OPS_INFRA_TASKS } from './infra'
import { OPS_NATIVE_TASKS } from './native'
import { OPS_TEST_TASKS } from './test'

export const OPS_TASKS: TaskDef[] = [
  ...OPS_BUILD_TASKS,
  ...OPS_TEST_TASKS,
  ...OPS_FIXTURES_TASKS,
  ...OPS_DAISY_TASKS,
  ...OPS_NATIVE_TASKS,
  ...OPS_INFRA_TASKS,
  ...OPS_DEPLOY_TASKS,
  ...OPS_DOCS_TASKS,
  ...OPS_CI_TASKS,
]
