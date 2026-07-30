import type { DEVICELIKE } from 'zss/device/types'
import { createjsonpipe } from 'zss/feature/jsonpipe/observe'
import { MEMORYFS_DEBOUNCE_MS } from 'zss/feature/memoryfs/constants'
import {
  buildmemoryfsexportfiles,
  memoryfsorphanpaths,
} from 'zss/feature/memoryfs/export'
import {
  memoryfslog,
  memoryfslogverbose,
  memoryfspathsample,
} from 'zss/feature/memoryfs/log'
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
let lastexportsummary = ''

export function memoryfsreadattached(): boolean {
  return attached
}

export function memoryfsreadlastexportsummary(): string {
  return lastexportsummary
}

export function memoryfssetattached(value: boolean) {
  attached = value
  if (!value) {
    if (debouncetimer) {
      clearTimeout(debouncetimer)
      debouncetimer = undefined
    }
    lastpaths = []
    lastexportsummary = ''
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
  lastexportsummary = ''
  memoryfsprimshadow()
}

function emitwrite(device: DEVICELIKE, player: string, full: boolean) {
  if (!attached || suppressoutbound) {
    return
  }
  const files = buildmemoryfsexportfiles()
  const deletes = full ? [] : memoryfsorphanpaths(lastpaths, files)
  lastpaths = files.map((f) => f.path)
  const mode = full ? 'full' : 'delta'
  lastexportsummary = `out ${files.length} files ${deletes.length} deletes (${mode})`
  memoryfslog(device, player, lastexportsummary)
  if (files.length > 0) {
    memoryfslogverbose(
      device,
      player,
      `out paths${memoryfspathsample(files.map((f) => f.path))}`,
    )
  }
  if (deletes.length > 0) {
    memoryfslogverbose(
      device,
      player,
      `out deletes${memoryfspathsample(deletes)}`,
    )
  }
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
  memoryfslogverbose(
    device,
    memoryreadoperator(),
    `diff ${operations.length} ops $26 schedule export`,
  )
  memoryfsscheduleexport(device, memoryreadoperator())
}
