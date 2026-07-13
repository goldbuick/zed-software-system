import type {
  WanixSessionMeta,
  WanixTermTileBuffer,
} from 'zss/device/wanixclient/state'
import {
  readattachedsession,
  readwanixactivesession,
} from 'zss/device/wanixclient/wanixdisplay'
import { readwanixroomconfig } from 'zss/device/wanixclient/wanixroom'
import {
  readwanixtermbuffer,
  readwanixtermbufferkeys,
} from 'zss/device/wanixclient/wanixtermbuffer'
import { readwanixtasklabel } from 'zss/feature/wanix/wanixmenu'
import { DEFAULT_WANIX_VM_ID } from 'zss/feature/wanix/wanixroomtypes'

export function readwanixsessionlabel(sessionkey: string): string {
  const room = readwanixroomconfig()
  const task = room.tasks.find((entry) => entry.id === sessionkey)
  if (task) {
    return readwanixtasklabel(task)
  }
  if (room.vm?.id === sessionkey || sessionkey === DEFAULT_WANIX_VM_ID) {
    return `${sessionkey} — linux vm`
  }
  return sessionkey
}

export function readwanixsessionmeta(
  sessionkey: string,
  buffer?: WanixTermTileBuffer | null,
): WanixSessionMeta | null {
  const snap = buffer ?? readwanixtermbuffer(sessionkey)
  if (!snap) {
    return null
  }
  return {
    sessionkey,
    attached: readattachedsession() === sessionkey,
    active: readwanixactivesession() === sessionkey,
    cols: snap.cols,
    rows: snap.rows,
    scrollbackrows: snap.scrollbackrows ?? 0,
    digest: snap.digest,
    version: snap.version,
    altactive: snap.altactive ?? false,
    bracketedpaste: snap.bracketedpaste ?? false,
    label: readwanixsessionlabel(sessionkey),
  }
}

export function listwanixsessions(): WanixSessionMeta[] {
  const keys = readwanixtermbufferkeys()
  const result: WanixSessionMeta[] = []
  for (const key of keys) {
    const meta = readwanixsessionmeta(key)
    if (meta) {
      result.push(meta)
    }
  }
  return result
}

export function formatwanixtermstatusline(meta: WanixSessionMeta): string {
  const flags: string[] = []
  if (meta.attached) {
    flags.push('attached')
  }
  if (meta.active) {
    flags.push('active')
  }
  if (meta.altactive) {
    flags.push('alt')
  }
  const flagtext = flags.length ? ` [${flags.join(',')}]` : ''
  return `${meta.label}${flagtext} ${meta.cols}x${meta.rows} scrollback=${meta.scrollbackrows} v=${meta.version}`
}
