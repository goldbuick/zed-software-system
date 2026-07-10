import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerpaint, waniximportresult } from 'zss/device/api'
import { boardrunnerboundarypaint } from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunneraccessfor } from 'zss/device/vm/boardrunnermanagement'
import { boardrunners } from 'zss/device/vm/state'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import { primezedcafeexportshadow } from 'zss/feature/wanix/wanixstateexport'
import {
  applyzedcafetomemory,
  parsezedcafeexportfiles,
} from 'zss/feature/wanix/wanixstateimport'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'
import { ispresent } from 'zss/mapping/types'
import { memorycollecttickboundaries } from 'zss/memory/boardwait'
import { memoryboundaryget } from 'zss/memory/boundaries'
import { memoryreadbookbysoftware, memorywritefrozen } from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

function readimportfiles(
  data: unknown,
): WANIX_ZED_CAFE_EXPORT_FILE[] | undefined {
  if (!ispresent(data) || typeof data !== 'object') {
    return undefined
  }
  const payload = data as { files?: unknown }
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
  return files
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

export function handleimportzedcafe(vm: DEVICE, message: MESSAGE): void {
  const files = readimportfiles(message.data)
  if (!files) {
    waniximportresult(
      vm,
      message.player,
      false,
      false,
      'import-zedcafe payload rejected',
    )
    return
  }
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    waniximportresult(
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
    const parsed = parsezedcafeexportfiles(files)
    const changed = applyzedcafetomemory(parsed)
    primezedcafeexportshadow()
    if (changed) {
      // Full replace of codepage runtimes — emitdiff alone can miss or desync;
      // paint so the live boardrunner gets terrain immediately.
      paintboardrunnersafterimport(vm)
    }
    waniximportresult(
      vm,
      message.player,
      true,
      changed,
      undefined,
      parsed.books.length,
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    waniximportresult(vm, message.player, false, false, detail)
  } finally {
    memorywritefrozen(false)
  }
}
