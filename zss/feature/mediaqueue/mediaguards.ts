import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { memorycanruncommand } from 'zss/memory/permissions'
import { memoryisoperator } from 'zss/memory/session'

/** Run on VM thread only (chip / vm:media). Bridge MEMORY has no operator/token. */
export function mediacanmanagequeue(player: string): boolean {
  return (
    memoryisoperator(player) || memorycanruncommand(player, 'mediamanage')
  )
}

export function mediarequiremanageonvm(player: string): boolean {
  if (!mediacanmanagequeue(player)) {
    apierror(SOFTWARE, player, 'media', 'queue admin only')
    return false
  }
  return true
}

export function mediapayloadwithmanage(
  player: string,
  data?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...data,
    canmanage: mediacanmanagequeue(player),
  }
}

export function mediareadcanmanagefrompayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false
  }
  return (data as { canmanage?: unknown }).canmanage === true
}
