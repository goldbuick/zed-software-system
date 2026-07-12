import { digestwanixtermcells } from 'zss/feature/wanix/wanixtermgridstate'
import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'
import {
  addopensession,
  bumptermbuffer,
  clearwanixtermbuffersstore,
  deleteopensession,
  deletewanixtermbuffer,
  hasopensession,
  readopensessions,
  readtermbuffers,
  readwanixtermbuffer as readtermbufferstate,
  readwanixtermbufferkeys as readtermbufferkeysstate,
  readwanixtermnotifyversion as readtermnotifyversionstate,
  resetwanixtermbufferfortest as resettermbufferfortest,
  setwanixtermbuffer,
  subscribewanixtermbuffer as subscribetermbuffer,
  type WanixTermTileBuffer,
} from 'zss/device/wanixclient/state'

export function clearwanixtermbuffers() {
  const buffers = readtermbuffers()
  const opensessions = readopensessions()
  if (buffers.size === 0 && opensessions.size === 0) {
    return
  }
  clearwanixtermbuffersstore()
  bumptermbuffer()
}

export function registerwanixtermsessionopen(sessionkey: string) {
  if (hasopensession(sessionkey)) {
    return
  }
  addopensession(sessionkey)
  bumptermbuffer()
}

export function unregisterwanixtermsession(sessionkey: string) {
  let changed = deleteopensession(sessionkey)
  if (deletewanixtermbuffer(sessionkey)) {
    changed = true
  }
  if (changed) {
    bumptermbuffer()
  }
}

export function removewanixtermbuffer(sessionkey: string): boolean {
  if (!deletewanixtermbuffer(sessionkey)) {
    return false
  }
  bumptermbuffer()
  return true
}

export function applywanixtermread(
  sessionkey: string,
  snapshot: WanixTermCellsSnapshot,
): boolean {
  const digest =
    snapshot.digest.length > 0
      ? snapshot.digest
      : digestwanixtermcells(snapshot)
  const prev = readtermbufferstate(sessionkey)
  if (prev?.digest === digest) {
    return false
  }
  const version = (prev?.version ?? 0) + 1
  setwanixtermbuffer(sessionkey, { ...snapshot, digest, version })
  bumptermbuffer()
  return true
}

export function readwanixtermbuffer(
  sessionkey: string,
): WanixTermTileBuffer | null {
  return readtermbufferstate(sessionkey)
}

export function readwanixtermbufferkeys(): string[] {
  return readtermbufferkeysstate()
}

export function readwanixtermnotifyversion() {
  return readtermnotifyversionstate()
}

export function subscribewanixtermbuffer(listener: () => void) {
  return subscribetermbuffer(listener)
}

/** Test hook */
export function resetwanixtermbufferfortest() {
  resettermbufferfortest()
}
