import type { DEVICELIKE } from 'zss/device/api'
import { apierror, apilog } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { pickwanixbundleentry } from 'zss/feature/wanix/wanixbundle'
import { uniquewanixtaskid } from 'zss/feature/wanix/wanixcmd'
import {
  ensurewanixsandbox,
  listwanixdir,
  mountwanixarchive,
  putwanixfile,
  spawnwanixtask,
} from 'zss/feature/wanix/wanixhost'
import { readwanixtasks, registertask } from 'zss/feature/wanix/wanixsession'

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

async function launchwanixload(
  device: DEVICELIKE,
  player: string,
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
  await ensurewanixsandbox(device, player)

  const taskid = uniquewanixtaskid(
    label,
    readwanixtasks().map((task) => task.id),
  )
  let entrycmd = label
  if (kind === 'wasm') {
    await putwanixfile(label, bytes)
  } else {
    const bundleprefix = `bundle-${taskid}`
    await mountwanixarchive(label, bytes, bundleprefix)
    const rootentries = await listwanixdir('.')
    let bundleentries: string[] | null = null
    try {
      bundleentries = await listwanixdir(bundleprefix)
    } catch {
      bundleentries = null
    }
    entrycmd = pickwanixbundleentry(rootentries, bundleentries, bundleprefix)
  }

  registertask({ id: taskid, label, entrycmd })
  await spawnwanixtask(entrycmd, {
    taskid,
    attach: true,
  })
  apilog(device, player, `wanix run ${taskid} ${entrycmd}`)
}

export async function wanixhandledrop(
  device: DEVICELIKE,
  player: string,
  label: string,
  kind: 'wasm' | 'bundle',
  bytes: Uint8Array,
) {
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

export async function parsewanixwasm(player: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await wanixhandledrop(SOFTWARE, player, file.name, 'wasm', bytes)
}

export async function parsewanixbundle(player: string, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  await wanixhandledrop(SOFTWARE, player, file.name, 'bundle', bytes)
}
