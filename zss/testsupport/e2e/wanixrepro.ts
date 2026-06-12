import { vmcli } from 'zss/device/api'
import { register, registerreadplayer } from 'zss/device/register'
import { useTerminal } from 'zss/gadget/data/state'
import {
  iswanixspaceactive,
  readwanixhoststate,
} from 'zss/feature/wanix/wanixiframehost'

export type WANIX_SMOKE_REPORT = {
  logs: string[]
  sawstarted: boolean
  sawruncmd: boolean
  sawhello: boolean
  sawexit: boolean
  sawerror: boolean
  hoststate: string
  iframepresent: boolean
  iframesrc: string
  errormessage?: string
}

function logslicefrom(start: number): string[] {
  const buf = useTerminal.getState().buffer ?? []
  return buf.slice(start).map((line) => String(line))
}

function buildreport(logs: string[]): WANIX_SMOKE_REPORT {
  const joined = logs.join('\n')
  const mount = document.getElementById('zss-wanix-display')
  const frame = mount?.querySelector('iframe')
  return {
    logs,
    sawstarted: joined.includes('wanix started'),
    sawruncmd: joined.includes('wanix run hello.wasm'),
    sawhello: joined.includes('Hello from wanix!'),
    sawexit: /wanix run exit \d+/.test(joined),
    sawerror: joined.includes('wanix>>') || joined.includes('task output timeout'),
    hoststate: readwanixhoststate(),
    iframepresent: !!frame,
    iframesrc: frame?.src ?? '',
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Run #wanix stop → start → run hello.wasm and collect terminal evidence. */
export async function runwanixsmoke(deadlinems = 90_000): Promise<WANIX_SMOKE_REPORT> {
  const player = registerreadplayer()
  const logstart = (useTerminal.getState().buffer ?? []).length

  vmcli(register, player, '#wanix stop')
  await sleep(300)
  vmcli(register, player, '#wanix start')

  const started = Date.now()
  while (Date.now() - started < deadlinems) {
    const logs = logslicefrom(logstart)
    const partial = buildreport(logs)
    if (partial.sawstarted || iswanixspaceactive()) {
      break
    }
    await sleep(250)
  }

  vmcli(register, player, '#wanix run hello.wasm')

  while (Date.now() - started < deadlinems) {
    const logs = logslicefrom(logstart)
    const report = buildreport(logs)
    if (report.sawhello && report.sawexit) {
      return report
    }
    if (report.sawerror) {
      report.errormessage = 'wanix apierror in scrollback'
      return report
    }
    await sleep(250)
  }

  const logs = logslicefrom(logstart)
  const report = buildreport(logs)
  report.errormessage = `deadline ${deadlinems}ms — logs:\n${logs.slice(-12).join('\n')}`
  return report
}

export function readwanixdiag(): Pick<
  WANIX_SMOKE_REPORT,
  'hoststate' | 'iframepresent' | 'iframesrc'
> {
  const mount = document.getElementById('zss-wanix-display')
  const frame = mount?.querySelector('iframe')
  return {
    hoststate: readwanixhoststate(),
    iframepresent: !!frame,
    iframesrc: frame?.src ?? '',
  }
}
