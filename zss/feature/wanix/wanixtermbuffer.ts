import type { WanixTermCellsSnapshot } from 'zss/feature/wanix/wanixtermgridstate'
import { digestwanixtermcells } from 'zss/feature/wanix/wanixtermgridstate'

export type WanixTermTileBuffer = WanixTermCellsSnapshot & {
  version: number
}

const buffers = new Map<string, WanixTermTileBuffer>()
const listeners = new Set<() => void>()
let notifyversion = 0

function bump() {
  notifyversion += 1
  for (const listener of listeners) {
    listener()
  }
}

export function clearwanixtermbuffers() {
  if (buffers.size === 0) {
    return
  }
  buffers.clear()
  bump()
}

export function applywanixtermread(
  sessionkey: string,
  snapshot: WanixTermCellsSnapshot,
): boolean {
  const digest =
    snapshot.digest.length > 0
      ? snapshot.digest
      : digestwanixtermcells(snapshot)
  const prev = buffers.get(sessionkey)
  if (prev?.digest === digest) {
    return false
  }
  const version = (prev?.version ?? 0) + 1
  buffers.set(sessionkey, { ...snapshot, digest, version })
  bump()
  return true
}

export function readwanixtermbuffer(
  sessionkey: string,
): WanixTermTileBuffer | null {
  return buffers.get(sessionkey) ?? null
}

export function readwanixtermbufferkeys(): string[] {
  return [...buffers.keys()]
}

export function readwanixtermnotifyversion() {
  return notifyversion
}

export function subscribewanixtermbuffer(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Test hook */
export function resetwanixtermbufferfortest() {
  buffers.clear()
  listeners.clear()
  notifyversion = 0
}
