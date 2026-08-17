import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediaplayerdisplayname } from 'zss/feature/mediaqueue/playerdisplayname'
import { isstring } from 'zss/mapping/types'
import { memoryplayerallowedcommand } from 'zss/memory/permissions'
import { memoryisoperator } from 'zss/memory/session'

/** Run on VM thread only (chip / vm:media). Bridge MEMORY has no operator/token. */
export function mediacanmanagequeue(player: string): boolean {
  return (
    memoryisoperator(player) ||
    memoryplayerallowedcommand(player, 'mediamanage')
  )
}

export function mediarequiremanageonvm(
  player: string,
  label = 'media',
): boolean {
  if (!mediacanmanagequeue(player)) {
    apierror(SOFTWARE, player, label, 'queue admin only')
    return false
  }
  return true
}

/**
 * Bridge MEMORY has no operator/token or player flags, so the VM resolves both
 * the manage grant and the submitter name here and ships them in the payload.
 */
export function mediapayloadwithmanage(
  player: string,
  data?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...data,
    canmanage: mediacanmanagequeue(player),
    displayname: mediaplayerdisplayname(player),
  }
}

export function mediareadcanmanagefrompayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false
  }
  return (data as { canmanage?: unknown }).canmanage === true
}

export function mediareaddisplaynamefrompayload(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return ''
  }
  const name = (data as { displayname?: unknown }).displayname
  return isstring(name) ? name.trim() : ''
}
