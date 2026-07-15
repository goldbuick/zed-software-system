import type { DEVICE } from 'zss/device'
import { boardrunnerpaint, wanixclientimportresult } from 'zss/device/api'
import type { MESSAGE } from 'zss/device/types'
import { boardrunnerboundarypaint } from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunneraccessfor } from 'zss/device/vm/boardrunnermanagement'
import { boardrunners } from 'zss/device/vm/state'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import { primezedcafeexportshadow } from 'zss/feature/wanix/wanixstateexport'
import {
  applyzedcafepartialtomemory,
  applyzedcafetomemory,
  parsezedcafeexportfiles,
} from 'zss/feature/wanix/wanixstateimport'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'
import { ispresent } from 'zss/mapping/types'
import { memorycollecttickboundaries } from 'zss/memory/boardwait'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memoryreadbookbysoftware, memorywritefrozen } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

function readimportpayload(data: unknown):
  | {
      files: WANIX_ZED_CAFE_EXPORT_FILE[]
      partial: boolean
      removepaths: string[]
    }
  | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as {
    files?: unknown
    partial?: unknown
    removepaths?: unknown
  }
  if (!Array.isArray(payload.files)) {
    return undefined
  }
  const files: WANIX_ZED_CAFE_EXPORT_FILE[] = []
  for (let i = 0; i < payload.files.length; ++i) {
    const file = payload.files[i] as {
      path?: unknown
      bytes?: unknown
    }
    if (typeof file?.path !== 'string') {
      return undefined
    }
    let bytes: Uint8Array
    if (file.bytes instanceof Uint8Array) {
      bytes = file.bytes
    } else if (Array.isArray(file.bytes)) {
      bytes = new Uint8Array(file.bytes as number[])
    } else {
      return undefined
    }
    files.push({ path: file.path, bytes })
  }
  const removepaths: string[] = []
  if (Array.isArray(payload.removepaths)) {
    for (let i = 0; i < payload.removepaths.length; ++i) {
      const path = payload.removepaths[i]
      if (typeof path !== 'string') {
        return undefined
      }
      removepaths.push(path)
    }
  }
  return {
    files,
    partial: payload.partial === true,
    removepaths,
  }
}

/** Full-paint active boardrunner boundaries after a bulk codepage replace. */
function paintboardrunnersafterimport(vm: DEVICE) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const ids = Object.keys(boardrunners)
  for (let i = 0; i < ids.length; ++i) {
    const board = ids[i]
    const player = boardrunners[board]
    const bounds = memorycollecttickboundaries(
      mainbook,
      boardrunneraccessfor(board),
    )
    for (let j = 0; j < bounds.length; ++j) {
      const id = bounds[j]
      const doc = memoryboundaryget(id) ?? {}
      boardrunnerboundarypaint(id, doc)
      boardrunnerpaint(vm, player, doc, id)
    }
  }
}

/** Paint only boundaries touched by a partial import. */
function paintboardrunnersforids(vm: DEVICE, paintids: string[]) {
  if (paintids.length === 0) {
    return
  }
  const paintset = new Set(paintids)
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    return
  }
  const ids = Object.keys(boardrunners)
  for (let i = 0; i < ids.length; ++i) {
    const board = ids[i]
    const player = boardrunners[board]
    if (paintset.has(board)) {
      const doc = memoryboundaryget(board) ?? {}
      boardrunnerboundarypaint(board, doc)
      boardrunnerpaint(vm, player, doc, board)
    }
    const bounds = memorycollecttickboundaries(
      mainbook,
      boardrunneraccessfor(board),
    )
    for (let j = 0; j < bounds.length; ++j) {
      const id = bounds[j]
      if (!paintset.has(id)) {
        continue
      }
      const doc = memoryboundaryget(id) ?? {}
      boardrunnerboundarypaint(id, doc)
      boardrunnerpaint(vm, player, doc, id)
    }
  }
}

export function handleimportzedcafe(vm: DEVICE, message: MESSAGE): void {
  const payload = readimportpayload(message.data)
  if (!payload) {
    wanixclientimportresult(
      vm,
      message.player,
      false,
      false,
      'importzedcafe payload rejected',
    )
    return
  }
  const check = validatezedcafeexportpaths(payload.files, {
    partial: payload.partial,
  })
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    wanixclientimportresult(
      vm,
      message.player,
      false,
      false,
      `invalid tree — ${detail}`,
    )
    return
  }
  memorywritefrozen(true)
  try {
    if (payload.partial) {
      const result = applyzedcafepartialtomemory(
        payload.files,
        payload.removepaths,
      )
      primezedcafeexportshadow()
      if (result.changed) {
        paintboardrunnersforids(vm, result.paintids)
      }
      wanixclientimportresult(
        vm,
        message.player,
        true,
        result.changed,
        undefined,
        result.bookcount,
      )
      return
    }
    const parsed = parsezedcafeexportfiles(payload.files)
    const changed = applyzedcafetomemory(parsed)
    primezedcafeexportshadow()
    if (changed) {
      // Full replace of codepage runtimes — emitdiff alone can miss or desync;
      // paint so the live boardrunner gets terrain immediately.
      paintboardrunnersafterimport(vm)
    }
    wanixclientimportresult(
      vm,
      message.player,
      true,
      changed,
      undefined,
      parsed.books.length,
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    wanixclientimportresult(vm, message.player, false, false, detail)
  } finally {
    memorywritefrozen(false)
  }
}
