import type { DEVICELIKE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { terminalwritelines } from 'zss/feature/terminalwritelines'
import { pickwanixbundleentry } from 'zss/feature/wanix/wanixbundle'
import {
  ensurewanixsandbox,
  haltwanixtask,
  iswanixspaceactive,
  listwanixbinds,
  listwanixdir,
  mountwanixarchive,
  putwanixfile,
  runwanixcommand,
  sendwanixtermwrite,
  unmountallwanixbinds,
  unmountwanixbind,
} from 'zss/feature/wanix/wanixiframehost'
import { wanixiobridgeflush } from 'zss/feature/wanix/wanixiobridge'
import {
  clearwanixpending,
  readwanixbinary,
  readwanixpending,
  readwanixphase,
  setwanixhalted,
  setwanixidle,
  setwanixrunning,
  setwanixtermrouting,
  setwanixstopped,
  stashwanixpending,
} from 'zss/feature/wanix/wanixsession'
import { writehyperlink } from 'zss/feature/writeui'
import { zssheaderlines, zsstexttape } from 'zss/feature/zsstextui'

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
  writehyperlink(
    device,
    player,
    'wanix replace',
    `Replace with ${pendinglabel}`,
  )
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
    showwanixconflictprompt(device, player, label, running?.label ?? 'binary')
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

export async function wanixhandlereplace(device: DEVICELIKE, player: string) {
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

export async function wanixhandlestop(device: DEVICELIKE, player: string) {
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

export async function wanixhandletermwrite(
  device: DEVICELIKE,
  player: string,
  line: string,
) {
  try {
    await sendwanixtermwrite(line)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export function wanixhandledetach(device: DEVICELIKE, player: string) {
  if (readwanixphase() !== 'running') {
    apierror(device, player, 'wanix', 'nothing running to detach from')
    return
  }
  if (!readwanixbinary()) {
    apierror(device, player, 'wanix', 'no active binary')
    return
  }
  setwanixtermrouting(false)
  apilog(
    device,
    player,
    `wanix term detached — ${readwanixbinary()?.label ?? 'binary'} still running (#wanix attach to resume)`,
  )
}

export function wanixhandleattach(device: DEVICELIKE, player: string) {
  if (readwanixphase() !== 'running') {
    apierror(device, player, 'wanix', 'nothing running to attach to')
    return
  }
  const active = readwanixbinary()
  if (!active) {
    apierror(device, player, 'wanix', 'no active binary')
    return
  }
  setwanixtermrouting(true)
  apilog(
    device,
    player,
    `wanix term attached — typing goes to ${active.label} (#wanix detach to escape routing)`,
  )
}

export async function wanixhandleunbindshow(
  device: DEVICELIKE,
  player: string,
) {
  try {
    await ensurewanixsandbox(device, player)
    const binds = await listwanixbinds()
    if (binds.length === 0) {
      apilog(device, player, 'wanix nothing to unbind')
      return
    }
    terminalwritelines(
      device,
      player,
      zsstexttape(
        zssheaderlines('wanix unbind'),
        '$whiteMounted binds:',
      ),
    )
    for (const bind of binds) {
      terminalwritelines(
        device,
        player,
        zsstexttape(
          `$white${bind.kind} → ${bind.dst} $7(${bind.label})$white`,
        ),
      )
      writehyperlink(
        device,
        player,
        `wanix unbind ${bind.id}`,
        `Unmount ${bind.label}`,
      )
    }
    writehyperlink(
      device,
      player,
      'wanix unbind all',
      `Unmount all (${binds.length} binds)`,
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

export async function wanixhandleunbind(
  device: DEVICELIKE,
  player: string,
  target: string,
) {
  try {
    await ensurewanixsandbox(device, player)
    if (target === 'all') {
      const removed = await unmountallwanixbinds()
      if (removed.length === 0) {
        apilog(device, player, 'wanix nothing to unbind')
        return
      }
      apilog(device, player, `wanix unmounted ${removed.length} binds`)
      return
    }
    const binds = await listwanixbinds()
    const match = binds.find((bind) => bind.id === target)
    await unmountwanixbind(target)
    apilog(device, player, `wanix unmounted ${match?.label ?? target}`)
  } catch (err) {
    apierror(
      device,
      player,
      'wanix',
      err instanceof Error ? err.message : String(err),
    )
  }
}
