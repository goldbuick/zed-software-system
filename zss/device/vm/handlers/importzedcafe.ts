import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { boardrunnerpaint, waniximportresult } from 'zss/device/api'
import { boardrunnerboundarypaint } from 'zss/device/vm/boardrunnerboundarysync'
import { boardrunneraccessfor } from 'zss/device/vm/boardrunnermanagement'
import { boardrunners } from 'zss/device/vm/state'
import {
  applyzedcafetomemory,
  countgreenringterraincells,
  parsezedcafeexportfiles,
} from 'zss/feature/wanix/wanixstateimport'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import { primezedcafeexportshadow } from 'zss/feature/wanix/wanixstateexport'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'
import { ispresent } from 'zss/mapping/types'
import { memorycollecttickboundaries } from 'zss/memory/boardwait'
import { memoryboundaryget } from 'zss/memory/boundaries'
import {
  memoryreadbookbysoftware,
  memorywritefrozen,
} from 'zss/memory/session'
import { MEMORY_LABEL } from 'zss/memory/types'

function tracezedcafeimport(message: string, detail?: Record<string, unknown>) {
  if (detail) {
    console.info(`[zedcafe-import] ${message}`, detail)
  } else {
    console.info(`[zedcafe-import] ${message}`)
  }
}

function readimportfiles(data: unknown): WANIX_ZED_CAFE_EXPORT_FILE[] | undefined {
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

function summarizeterrainfiles(files: WANIX_ZED_CAFE_EXPORT_FILE[]) {
  const terrainfiles: {
    path: string
    bytes: number
    greencells: number
  }[] = []
  for (let i = 0; i < files.length; ++i) {
    const file = files[i]
    if (!file.path.endsWith('/board/terrain.json')) {
      continue
    }
    let greencells = 0
    try {
      greencells = countgreenringterraincells(
        JSON.parse(new TextDecoder().decode(file.bytes)),
      )
    } catch {
      greencells = -1
    }
    terrainfiles.push({
      path: file.path,
      bytes: file.bytes.length,
      greencells,
    })
  }
  return terrainfiles
}

/** Full-paint active boardrunner boundaries after a bulk codepage replace. */
function paintboardrunnersafterimport(vm: DEVICE) {
  const mainbook = memoryreadbookbysoftware(MEMORY_LABEL.MAIN)
  if (!ispresent(mainbook)) {
    tracezedcafeimport('boardrunner-paint skip — no main book')
    return
  }
  const ids = Object.keys(boardrunners)
  let paintcount = 0
  for (let i = 0; i < ids.length; ++i) {
    const board = ids[i]
    const player = boardrunners[board]
    const bounds = memorycollecttickboundaries(
      mainbook,
      boardrunneraccessfor(board),
    )
    for (let j = 0; j < bounds.length; ++j) {
      const id = bounds[j]
      const doc = memoryboundaryget<{
        board?: { id?: string; terrain?: unknown }
      }>(id)
      const greencells = countgreenringterraincells(doc?.board?.terrain)
      tracezedcafeimport('boardrunner-paint', {
        runnerboard: board,
        boundary: id,
        boardid: doc?.board?.id ?? null,
        greencells,
        player,
      })
      boardrunnerboundarypaint(id, doc ?? {})
      boardrunnerpaint(vm, player, doc ?? {}, id)
      paintcount += 1
    }
  }
  tracezedcafeimport('boardrunner-paint done', {
    runners: ids.length,
    paints: paintcount,
  })
}

export function handleimportzedcafe(vm: DEVICE, message: MESSAGE): void {
  const files = readimportfiles(message.data)
  if (!files) {
    tracezedcafeimport('vm handler rejected payload')
    waniximportresult(vm, message.player, {
      ok: false,
      changed: false,
      error: 'import-zedcafe payload rejected',
    })
    return
  }
  const terrainfiles = summarizeterrainfiles(files)
  tracezedcafeimport('vm handler start', {
    player: message.player,
    files: files.length,
    terrainfiles,
  })
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
    tracezedcafeimport('vm handler invalid tree', { detail })
    waniximportresult(vm, message.player, {
      ok: false,
      changed: false,
      error: `invalid tree — ${detail}`,
    })
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
    tracezedcafeimport('vm handler result', {
      ok: true,
      changed,
      bookcount: parsed.books.length,
    })
    waniximportresult(vm, message.player, {
      ok: true,
      changed,
      bookcount: parsed.books.length,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    tracezedcafeimport('vm handler error', { detail })
    waniximportresult(vm, message.player, {
      ok: false,
      changed: false,
      error: detail,
    })
  } finally {
    memorywritefrozen(false)
  }
}
