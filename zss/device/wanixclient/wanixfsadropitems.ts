import { apierror } from 'zss/device/api'
import { dropwanixfsadirectory } from 'zss/device/wanixclient/wanixfsadrop'
import {
  readwanixfsahandlekind,
  sanitizewanixfsadst,
} from 'zss/feature/wanix/wanixfsapaths'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'

export type CafeDropPartition = {
  directories: FileSystemDirectoryHandle[]
  files: File[]
  /** True when a folder was dropped but FSA handle API is missing. */
  unsupporteddirectory: boolean
}

/**
 * Split a DataTransfer into directory handles (FSA) vs files.
 * Directory items are never converted via getAsFile().
 */
export async function partitioncafedrop(
  dt: DataTransfer,
): Promise<CafeDropPartition> {
  const directories: FileSystemDirectoryHandle[] = []
  const files: File[] = []
  let unsupporteddirectory = false

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
        try {
          const handle = await extended.getAsFileSystemHandle()
          const kind = readwanixfsahandlekind(handle)
          if (kind === 'directory' && handle) {
            directories.push(handle as FileSystemDirectoryHandle)
            continue
          }
        } catch {
          // fall through to file / entry probes
        }
      } else if (typeof extended.webkitGetAsEntry === 'function') {
        const entry = extended.webkitGetAsEntry()
        if (entry?.isDirectory) {
          unsupporteddirectory = true
          continue
        }
      }
      const file = item.getAsFile()
      if (ispresent(file)) {
        files.push(file)
      }
    }
  }

  if (!directories.length && !files.length && !unsupporteddirectory) {
    if (dt.files?.length) {
      files.push(...dt.files)
    }
  }

  return { directories, files, unsupporteddirectory }
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
