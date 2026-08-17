import { apierror } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { mediaplayerdisplayname } from 'zss/feature/mediaqueue/playerdisplayname'
import { isstring } from 'zss/mapping/types'
import { memoryplayerallowedcommand } from 'zss/memory/permissions'
import { memoryreadplayerboard } from 'zss/memory/playermanagement'
import { memoryreadboardruntime } from 'zss/memory/runtimeboundary'
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

/** Helper PeerJS id painted on the player's current board, or empty. VM only. */
export function mediareadboardhelperpeerid(player: string): string {
  const board = memoryreadplayerboard(player)
  const helper = memoryreadboardruntime(board)?.mediaqueuehelperpeerid
  return isstring(helper) ? helper.trim() : ''
}

/**
 * `#media` queue is the helper on the current board runtime.
 * Other boards have no field, so this fails off the bound board.
 */
export function mediarequireboardhelper(player: string): string {
  const helperpeerid = mediareadboardhelperpeerid(player)
  if (!helperpeerid) {
    apierror(SOFTWARE, player, 'media', 'not on a board with media')
    return ''
  }
  return helperpeerid
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

/** VM `#media` payload: manage flags plus current-board helper, or undefined if gated. */
export function mediapayloadwithboardhelper(
  player: string,
  data?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const helperpeerid = mediarequireboardhelper(player)
  if (!helperpeerid) {
    return undefined
  }
  const board = memoryreadplayerboard(player)
  return mediapayloadwithmanage(player, {
    ...data,
    helperpeerid,
    boardid: board?.id ?? '',
  })
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

export function mediareadhelperpeeridfrompayload(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return ''
  }
  const helperpeerid = (data as { helperpeerid?: unknown }).helperpeerid
  return isstring(helperpeerid) ? helperpeerid.trim() : ''
}
