import { def, handler } from '../../../helpers'
import type { TaskDef } from '../../../types'

export const OPS_FIXTURES_WANIX_TASKS: TaskDef[] = [
  def('ops:fixtures:wanix:build', {
    description:
      'Build WASI .wasm and .tgz drag-drop fixtures under ops/fixtures/wanix/ (needs wabt wat2wasm)',
    run: handler(async () => {
      const { buildwanixfixtures } = await import('ops/lib/wanix/buildfixtures')
      buildwanixfixtures()
      return 0
    }),
  }),
  def('ops:fixtures:wanix:zedcafe:build', {
    description:
      'Build the zed-cafe export daemon (Go js/wasm) into ops/fixtures/wanix/ and cafe/public/wanix/ (needs Go + submodules/wanix)',
    run: handler(async () => {
      const { buildwanixzedcafe } = await import('ops/lib/wanix/buildzedcafe')
      buildwanixzedcafe()
      return 0
    }),
  }),
]
