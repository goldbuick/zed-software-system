import { def } from '../helpers'
import { shellhandlerwithargs } from '../implementations/modulehandler'
import type { TaskDef } from '../types'

const CLANG = 'tasks/implementations/native/clang-format.sh'

export const NATIVE_TASKS: TaskDef[] = [
  def('native:lint', {
    description: 'clang-format check on first-party C++ (all targets)',
    tags: ['ci'],
    run: shellhandlerwithargs(CLANG, ['check', 'all']),
  }),
  def('native:lint:fix', {
    description: 'Apply clang-format to first-party C++ (all targets)',
    run: shellhandlerwithargs(CLANG, ['fix', 'all']),
  }),
]
