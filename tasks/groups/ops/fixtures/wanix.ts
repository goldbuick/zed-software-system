import { def, handler } from '../../../helpers'
import { hasflag } from '../../../lib/cliargv'
import type { TaskDef } from '../../../types'

export const OPS_FIXTURES_WANIX_TASKS: TaskDef[] = [
  def('ops:fixtures:wanix:toolchains', {
    description:
      'Check wanix fixture build toolchains (wabt, go, rust, zig, tinygo, clang, docker) and print install hints — see ops/fixtures/wanix/README.md',
    run: handler(async () => {
      const { printwanixtoolchainsreport, probewanixtoolchains } =
        await import('ops/lib/wanix/wanixtoolchains')
      const results = probewanixtoolchains()
      return printwanixtoolchainsreport(results)
    }),
  }),
  def('ops:fixtures:wanix:build', {
    description:
      'Build WASI .wasm, per-lang hello-*.wasm, and .tgz drag-drop fixtures into ops/public/wanix/ (run ops:fixtures:wanix:toolchains first; optional langs skip unless --strict)',
    run: handler(async (ctx) => {
      const strict = hasflag(ctx.args, '--strict')
      const { buildwanixfixtures } = await import('ops/lib/wanix/buildfixtures')
      buildwanixfixtures({ strict })
      return 0
    }),
  }),
  def('ops:fixtures:wanix:zedcafe:build', {
    description:
      'Build zed-cafe export daemon (Go js/wasm) into cafe/public/wanix/ (needs Go + submodules/wanix — run ops:fixtures:wanix:toolchains first)',
    run: handler(async () => {
      const { buildwanixzedcafe } = await import('ops/lib/wanix/buildzedcafe')
      buildwanixzedcafe()
      return 0
    }),
  }),
  def('ops:fixtures:wanix:findplayers:build', {
    description:
      'Build findplayers + greenring gojs tools into ops/public/wanix/ only (needs Go + submodules/wanix — run ops:fixtures:wanix:toolchains first)',
    run: handler(async () => {
      const { buildwanixfindplayers } = await import(
        'ops/lib/wanix/buildfindplayers'
      )
      buildwanixfindplayers()
      return 0
    }),
  }),
  def('ops:fixtures:wanix:linux:overlay:build', {
    description:
      'Build zedcafe-linux-overlay.tgz (Alpine i386 jq/curl/wget + zedcafe shell tools) into ops/public/wanix/ and cafe/public/wanix/ (needs Docker — run ops:fixtures:wanix:toolchains first)',
    run: handler(async () => {
      const { buildwanixlinuxoverlay } = await import(
        'ops/lib/wanix/buildlinuxoverlay'
      )
      buildwanixlinuxoverlay()
      return 0
    }),
  }),
]
