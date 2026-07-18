import { apierror } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { dropwanixfsadirectory } from 'zss/device/wanixclient/wanixfsadrop'
import {
  readwanixfsahandlekind,
  sanitizewanixfsadst,
} from 'zss/feature/wanix/wanixfsapaths'
import { ispresent } from 'zss/mapping/types'

export type CafeDropPartition = {
  directories: FileSystemDirectoryHandle[]
  files: File[]
  /** True when a folder was dropped but FSA handle API is missing. */
  unsupporteddirectory: boolean
}

type PendingDropItem =
  | { type: 'handle'; promise: Promise<FileSystemHandle | null> }
  | { type: 'file'; file: File }
  | { type: 'unsupported' }

/**
 * Synchronously capture drop items. Must run in the same tick as the `drop`
 * handler — Chrome clears DataTransfer after the event, and
 * getAsFileSystemHandle() must be invoked before any await.
 */
export function capturecafedropitems(dt: DataTransfer): PendingDropItem[] {
  const pending: PendingDropItem[] = []

  if (dt.items?.length) {
    for (const item of [...dt.items]) {
      if (item.kind !== 'file') {
        continue
      }
      const extended = item as DataTransferItem & {
        getAsFileSystemHandle?: () => Promise<FileSystemHandle>
        webkitGetAsEntry?: () => FileSystemEntry | null
      }
      if (typeof extended.getAsFileSystemHandle === 'function') {
        pending.push({
          type: 'handle',
          promise: extended.getAsFileSystemHandle().catch(() => null),
        })
        continue
      }
      if (typeof extended.webkitGetAsEntry === 'function') {
        const entry = extended.webkitGetAsEntry()
        if (entry?.isDirectory) {
          pending.push({ type: 'unsupported' })
          continue
        }
      }
      const file = item.getAsFile()
      if (ispresent(file)) {
        pending.push({ type: 'file', file })
      }
    }
  }

  if (pending.length === 0 && dt.files?.length) {
    for (const file of [...dt.files]) {
      pending.push({ type: 'file', file })
    }
  }

  return pending
}

/** Resolve handles captured during the drop event tick. */
export async function resolvecafedropitems(
  pending: PendingDropItem[],
): Promise<CafeDropPartition> {
  const directories: FileSystemDirectoryHandle[] = []
  const files: File[] = []
  let unsupporteddirectory = false

  for (const item of pending) {
    if (item.type === 'unsupported') {
      unsupporteddirectory = true
      continue
    }
    if (item.type === 'file') {
      files.push(item.file)
      continue
    }
    const handle = await item.promise
    const kind = readwanixfsahandlekind(handle)
    if (kind === 'directory' && handle) {
      directories.push(handle as FileSystemDirectoryHandle)
      continue
    }
    if (kind === 'file' && handle) {
      try {
        const file = await (handle as FileSystemFileHandle).getFile()
        files.push(file)
      } catch {
        // ignore unreadable file handles
      }
    }
  }

  return { directories, files, unsupporteddirectory }
}

/**
 * Split a DataTransfer into directory handles (FSA) vs files.
 * Prefer capturecafedropitems + resolvecafedropitems from drop handlers.
 */
export async function partitioncafedrop(
  dt: DataTransfer,
): Promise<CafeDropPartition> {
  return resolvecafedropitems(capturecafedropitems(dt))
}

export async function applycafedroppartition(
  partition: CafeDropPartition,
  onfile: (file: File) => void,
): Promise<void> {
  const player = registerreadplayer()
  if (partition.unsupporteddirectory) {
    apierror(
      SOFTWARE,
      player,
      'wanix',
      'folder drop needs Chromium File System Access (getAsFileSystemHandle)',
    )
  }
  if (
    partition.directories.length === 0 &&
    partition.files.length === 0 &&
    !partition.unsupporteddirectory
  ) {
    apierror(SOFTWARE, player, 'wanix', 'drop contained no files or folders')
    return
  }
  for (const handle of partition.directories) {
    const dst = sanitizewanixfsadst(handle.name)
    if (!dst) {
      apierror(
        SOFTWARE,
        player,
        'wanix',
        `folder mount dst invalid: ${String(handle.name)}`,
      )
      continue
    }
    await dropwanixfsadirectory(handle, dst)
  }
  for (const file of partition.files) {
    onfile(file)
  }
}
