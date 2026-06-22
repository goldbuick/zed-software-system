import { apitoast } from 'zss/device/api'
import { SOFTWARE } from 'zss/device/session'
import { memorypickcodepagewithtypeandstat } from 'zss/memory/codepages'
import { CODE_PAGE_TYPE } from 'zss/memory/types'

const ZZT_ELEMENT_LIBRARY_TOAST =
  'import or load an element library book before importing ZZT worlds'

export function haszztelementlibrary(): boolean {
  return !!memorypickcodepagewithtypeandstat(CODE_PAGE_TYPE.TERRAIN, 'solid')
}

/** Browser import paths: toast and return false when no terrain library is loaded. */
export function requirezztelementlibrary(player: string): boolean {
  if (haszztelementlibrary()) {
    return true
  }
  apitoast(SOFTWARE, player, ZZT_ELEMENT_LIBRARY_TOAST)
  return false
}

/** Node/task callers without a player id — throws when library is missing. */
export function assertzztelementlibrary(): void {
  if (!haszztelementlibrary()) {
    throw new Error(ZZT_ELEMENT_LIBRARY_TOAST)
  }
}
