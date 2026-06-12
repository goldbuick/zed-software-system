import { def, shell } from '../helpers'
import type { TaskDef } from '../types'

export const NATIVE_TASKS: TaskDef[] = [
  def('native:lint', {
    description: 'clang-format check on first-party C++ (all targets)',
    tags: ['ci'],
    run: shell('sh scripts/clang-format.sh check all'),
  }),
  def('native:lint:fix', {
    description: 'Apply clang-format to first-party C++ (all targets)',
    run: shell('sh scripts/clang-format.sh fix all'),
  }),
]
