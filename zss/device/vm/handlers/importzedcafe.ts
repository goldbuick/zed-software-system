import type { DEVICE } from 'zss/device'
import type { MESSAGE } from 'zss/device/api'
import { waniximportresult } from 'zss/device/api'
import { boardrunnerpushupdates } from 'zss/device/vm/boardrunnerpushupdates'
import {
  applyzedcafetomemory,
  parsezedcafeexportfiles,
} from 'zss/feature/wanix/wanixstateimport'
import type { WANIX_ZED_CAFE_EXPORT_FILE } from 'zss/feature/wanix/wanixstateexport'
import { primezedcafeexportshadow } from 'zss/feature/wanix/wanixstateexport'
import { validatezedcafeexportpaths } from 'zss/feature/wanix/zedcafetreeschema'
import { ispresent } from 'zss/mapping/types'
import { memorywritefrozen } from 'zss/memory/session'

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

export function handleimportzedcafe(vm: DEVICE, message: MESSAGE): void {
  const files = readimportfiles(message.data)
  if (!files) {
    waniximportresult(vm, message.player, {
      ok: false,
      changed: false,
      error: 'import-zedcafe payload rejected',
    })
    return
  }
  const check = validatezedcafeexportpaths(files)
  if (!check.ok) {
    const detail = check.errors[0] ?? 'unknown'
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
      boardrunnerpushupdates(vm)
    }
    waniximportresult(vm, message.player, {
      ok: true,
      changed,
      bookcount: parsed.books.length,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    waniximportresult(vm, message.player, {
      ok: false,
      changed: false,
      error: detail,
    })
  } finally {
    memorywritefrozen(false)
  }
}
