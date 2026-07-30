import type { DEVICELIKE } from 'zss/device/types'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { MEMORYFS_DEBOUNCE_MS } from 'zss/feature/memoryfs/constants'
import {
  buildmemoryfsexportfiles,
  memoryfsorphanpaths,
} from 'zss/feature/memoryfs/export'
import { memoryrootshouldemitpath } from 'zss/memory/jsonpipefilter'
import { memoryreadoperator, memoryreadroot } from 'zss/memory/session'
import type { BOOK } from 'zss/memory/types'

const bookspipe = createjsonpipe<Record<string, BOOK>>(
  {},
  memoryrootshouldemitpath,
)

let debouncetimer: ReturnType<typeof setTimeout> | undefined
let attached = false
let suppressoutbound = false
let lastpaths: string[] = []

export function memoryfsreadattached(): boolean {
  return attached
}

export function memoryfssetattached(value: boolean) {
  attached = value
  if (!value) {
    if (debouncetimer) {
      clearTimeout(debouncetimer)
      debouncetimer = undefined
    }
    lastpaths = []
  }
}

export function memoryfssetsuppressoutbound(value: boolean) {
  suppressoutbound = value
}

export function memoryfsprimshadow() {
  bookspipe.applyfullsync(memoryreadroot().books)
}

export function memoryfsresetfortest() {
  if (debouncetimer) {
    clearTimeout(debouncetimer)
    debouncetimer = undefined
  }
  attached = false
  suppressoutbound = false
  lastpaths = []
  memoryfsprimshadow()
}

function emitwrite(device: DEVICELIKE, player: string, full: boolean) {
  if (!attached || suppressoutbound) {
    return
  }
  const files = buildmemoryfsexportfiles()
  const deletes = full ? [] : memoryfsorphanpaths(lastpaths, files)
  lastpaths = files.map((f) => f.path)
  device.emit(player, 'register:memoryfswrite', {
    files,
    deletes,
    full,
  })
}

export function memoryfsrunexport(
  device: DEVICELIKE,
  player: string,
  full = false,
) {
  emitwrite(device, player, full)
}

export function memoryfsscheduleexport(device: DEVICELIKE, player: string) {
  if (!attached || suppressoutbound) {
    return
  }
  if (debouncetimer) {
    clearTimeout(debouncetimer)
  }
  debouncetimer = setTimeout(() => {
    debouncetimer = undefined
    emitwrite(device, player, false)
  }, MEMORYFS_DEBOUNCE_MS)
}

/** Call from VM tick while attached: schedule export when books diff. */
export function memoryfscheckontick(device: DEVICELIKE) {
  if (!attached || suppressoutbound) {
    return
  }
  const operations = bookspipe.emitdiff(memoryreadroot().books)
  if (operations.length === 0) {
    return
  }
  memoryfsscheduleexport(device, memoryreadoperator())
}
