import { def, handler } from '../../../helpers'
import type { TaskDef } from '../../../types'

export const OPS_FIXTURES_WANIX_TASKS: TaskDef[] = [
  def('ops:fixtures:wanix:build', {
    description:
      'Build WASI .wasm and .tgz drag-drop fixtures into ops/public/wanix/ (needs wabt wat2wasm)',
    run: handler(async () => {
      const { buildwanixfixtures } = await import('ops/lib/wanix/buildfixtures')
      buildwanixfixtures()
      return 0
    }),
  }),
  def('ops:fixtures:wanix:zedcafe:build', {
    description:
      'Build zed-cafe export daemon and findplayers scanner (Go js/wasm) into ops/public/wanix/ and cafe/public/wanix/ (needs Go + submodules/wanix)',
    run: handler(async () => {
      const { buildwanixzedcafe } = await import('ops/lib/wanix/buildzedcafe')
      buildwanixzedcafe()
      return 0
    }),
  }),
  def('ops:fixtures:wanix:linux:overlay:build', {
    description:
      'Build zedcafe-linux-overlay.tgz (Alpine i386 jq/curl/wget + zedcafe shell tools) into ops/public/wanix/ and cafe/public/wanix/ (needs Docker)',
    run: handler(async () => {
      const { buildwanixlinuxoverlay } = await import(
        'ops/lib/wanix/buildlinuxoverlay'
      )
      buildwanixlinuxoverlay()
      return 0
    }),
  }),
]
