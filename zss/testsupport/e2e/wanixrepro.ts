import { wanixstdin } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import {
  iswanixspaceactive,
  readwanixhoststate,
} from 'zss/feature/wanix/wanixiframehost'
import { parsewanixwasm } from 'zss/feature/wanix/wanixdrop'
import { iswanixstdinactive } from 'zss/feature/wanix/wanixsession'
import { useTape } from 'zss/gadget/data/state'
import { createechostdinwasmfile } from 'zss/testsupport/wanix/echostdin'
import { createhellowasmfile } from 'zss/testsupport/wanix/hellowasm'

export type WANIX_SMOKE_REPORT = {
  logs: string[]
  sawsandbox: boolean
  sawruncmd: boolean
  sawhello: boolean
  sawexit: boolean
  sawerror: boolean
  sawstdin: boolean
  hoststate: string
  iframepresent: boolean
  iframesrc: string
  errormessage?: string
}

function logslicefrom(start: number): string[] {
  const logs = useTape.getState().terminal.logs ?? []
  const added = logs.length - start
  if (added <= 0) {
    return []
  }
  return logs.slice(0, added).map((line) => String(line))
}

function buildreport(logs: string[]): WANIX_SMOKE_REPORT {
  const joined = logs.join('\n')
  const mount = document.getElementById('zss-wanix-display')
  const frame = mount?.querySelector('iframe')
  return {
    logs,
    sawsandbox: iswanixspaceactive(),
    sawruncmd: joined.includes('wanix run hello.wasm'),
    sawhello: joined.includes('Hello from wanix!'),
    sawexit: /wanix exit \d+/.test(joined),
    sawstdin: joined.includes('wanix stdin active'),
    sawerror:
      joined.includes('wanix>>') || joined.includes('task output timeout'),
    hoststate: readwanixhoststate(),
    iframepresent: !!frame,
    iframesrc: frame?.src ?? '',
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function drophellowasm(player: string) {
  await parsewanixwasm(player, createhellowasmfile())
}

/** Drop hello.wasm (auto-start sandbox) and collect terminal evidence. */
export async function runwanixsmoke(
  deadlinems = 90_000,
): Promise<WANIX_SMOKE_REPORT> {
  const player = registerreadplayer()
  const logstart = (useTape.getState().terminal.logs ?? []).length

  try {
    await drophellowasm(player)
  } catch (err) {
    const logs = logslicefrom(logstart)
    const report = buildreport(logs)
    report.errormessage =
      err instanceof Error ? err.message : String(err)
    return report
  }

  const started = Date.now()
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

/** Drop echo_stdin.wasm, send a line while blocking, collect evidence. */
export async function runwanixstdinsmoke(
  deadlinems = 90_000,
): Promise<WANIX_SMOKE_REPORT> {
  const player = registerreadplayer()
  const logstart = (useTape.getState().terminal.logs ?? []).length

  const droppromise = parsewanixwasm(player, createechostdinwasmfile())

  const started = Date.now()
  while (Date.now() - started < deadlinems) {
    if (iswanixstdinactive()) {
      break
    }
    const logs = logslicefrom(logstart)
    const report = buildreport(logs)
    if (report.sawerror) {
      report.errormessage = 'wanix apierror before stdin active'
      return report
    }
    await sleep(100)
  }

  if (!iswanixstdinactive()) {
    const logs = logslicefrom(logstart)
    const report = buildreport(logs)
    report.errormessage = 'stdin never became active'
    return report
  }

  wanixstdin(SOFTWARE, player, 'hello')
  await sleep(200)

  try {
    await droppromise
  } catch (err) {
    const logs = logslicefrom(logstart)
    const report = buildreport(logs)
    report.errormessage =
      err instanceof Error ? err.message : String(err)
    return report
  }

  const logs = logslicefrom(logstart)
  const report = buildreport(logs)
  if (logs.join('\n').includes('echo: hello') && report.sawexit) {
    return report
  }
  report.errormessage = `missing echo output — logs:\n${logs.slice(-16).join('\n')}`
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
