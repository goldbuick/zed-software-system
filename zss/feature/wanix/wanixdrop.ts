import type { DEVICELIKE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { pickwanixbundleentry } from 'zss/feature/wanix/wanixbundle'
import {
  ensurewanixsandbox,
  haltwanixtask,
  iswanixspaceactive,
  listwanixdir,
  mountwanixarchive,
  putwanixfile,
  runwanixcommand,
} from 'zss/feature/wanix/wanixiframehost'
import {
  clearwanixpending,
  readwanixbinary,
  readwanixpending,
  readwanixphase,
  setwanixhalted,
  setwanixidle,
  setwanixrunning,
  setwanixstopped,
  stashwanixpending,
} from 'zss/feature/wanix/wanixsession'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { writehyperlink } from 'zss/feature/writeui'
import { zssheaderlines, zsstexttape } from 'zss/feature/zsstextui'
import { wanixiobridgeflush } from 'zss/feature/wanix/wanixiobridge'
import { SOFTWARE } from 'zss/device/session'

export function iswanixwasmfile(name: string, bytes: Uint8Array): boolean {
  if (/\.wasm$/i.test(name)) {
    return true
  }
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  )
}

export function iswanixbundlefile(name: string): boolean {
  return /\.tgz$/i.test(name) || /\.tar\.gz$/i.test(name)
}

function showwanixconflictprompt(
  device: DEVICELIKE,
  player: string,
  pendinglabel: string,
  runninglabel: string,
) {
  terminalwritelines(
    device,
    player,
    zsstexttape(
      zssheaderlines('wanix'),
      `$yellow${runninglabel} is running`,
      '$whiteDrop another binary — choose:',
    ),
  )
  writehyperlink(device, player, 'wanix replace', `Replace with ${pendinglabel}`)
  writehyperlink(device, player, 'wanix keep', `Keep ${runninglabel}`)
}

async function launchwanixload(
  device: DEVICELIKE,
  player: string,
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
  await ensurewanixsandbox(device, player)
  let entrycmd = label
  if (kind === 'wasm') {
    await putwanixfile(label, bytes)
  } else {
    await mountwanixarchive(label, bytes)
    const rootentries = await listwanixdir('.')
    let bundleentries: string[] | null = null
    try {
      bundleentries = await listwanixdir('bundle')
    } catch {
      bundleentries = null
    }
    entrycmd = pickwanixbundleentry(rootentries, bundleentries)
  }
  setwanixrunning({ label, entrycmd })
  apilog(device, player, `wanix run ${entrycmd}`)
  try {
    const code = await runwanixcommand(entrycmd)
    wanixiobridgeflush()
    setwanixstopped(code)
    apilog(device, player, `wanix exit ${code}`)
  } catch (err) {
    wanixiobridgeflush()
    setwanixhalted()
    throw err
  }
}

export async function wanixhandledrop(
  device: DEVICELIKE,
  player: string,
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
  if (readwanixphase() === 'running') {
    stashwanixpending({ label, kind, bytes })
    const running = readwanixbinary()
    showwanixconflictprompt(
      device,
      player,
      label,
      running?.label ?? 'binary',
    )
    return
  }
  try {
    await launchwanixload(device, player, label, kind, bytes)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export async function wanixhandlereplace(
  device: DEVICELIKE,
  player: string,
) {
  const pending = readwanixpending()
  if (!pending) {
    apierror(device, player, 'wanix', 'no pending binary to replace with')
    return
  }
  if (readwanixphase() !== 'running') {
    apierror(device, player, 'wanix', 'nothing running to replace')
    return
  }
  clearwanixpending()
  try {
    await haltwanixtask()
    setwanixhalted()
    await launchwanixload(
      device,
      player,
      pending.label,
      pending.kind,
      pending.bytes,
    )
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export function wanixhandlekeep(device: DEVICELIKE, player: string) {
  const pending = readwanixpending()
  if (!pending) {
    apierror(device, player, 'wanix', 'no pending binary')
    return
  }
  clearwanixpending()
  apilog(device, player, `wanix kept ${readwanixbinary()?.label ?? 'binary'}`)
}

export async function wanixhandlestop(
  device: DEVICELIKE,
  player: string,
) {
  const phase = readwanixphase()
  if (phase === 'running') {
    try {
      await haltwanixtask()
      setwanixhalted()
      apilog(device, player, 'wanix halted')
    } catch (err) {
      apierror(
        device,
        player,
        'wanix',
        err instanceof Error ? err.message : String(err),
      )
    }
    return
  }
  if (phase === 'stopped') {
    setwanixidle()
    apilog(device, player, 'wanix cleared')
    return
  }
  if (iswanixspaceactive()) {
    apilog(device, player, 'wanix idle (sandbox warm)')
    return
  }
  apilog(device, player, 'wanix idle')
}

export async function parsewanixwasm(player: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await wanixhandledrop(SOFTWARE, player, file.name, 'wasm', bytes)
}

export async function parsewanixbundle(player: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await wanixhandledrop(SOFTWARE, player, file.name, 'bundle', bytes)
}
