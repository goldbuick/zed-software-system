import { registermemoryfsattach, vmloader } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { enableaudio } from 'zss/device/synth'
import {
  clearwasmcoepserviceworkers,
  ensurewasmcoep,
} from 'zss/feature/synth/backend/wasm/coopcoep'
import { useDeviceData } from 'zss/gadget/device'
import { Engine } from 'zss/gadget/engine'

function loadfiles(files: File[]) {
  files.forEach((file) =>
    vmloader(
      SOFTWARE,
      registerreadplayer(),
      undefined,
      'file',
      `file:${file.name}`,
      file,
    ),
  )
}

async function partitioncafedrop(dt: DataTransfer): Promise<{
  directories: FileSystemDirectoryHandle[]
  files: File[]
}> {
  const directories: FileSystemDirectoryHandle[] = []
  const files: File[] = []
  const items = dt.items
  if (items?.length) {
    for (let i = 0; i < items.length; ++i) {
      const item = items[i]
      const ashandle = (
        item as DataTransferItem & {
          getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>
        }
      ).getAsFileSystemHandle
      if (typeof ashandle === 'function') {
        try {
          const handle = await ashandle.call(item)
          if (handle?.kind === 'directory') {
            directories.push(handle as FileSystemDirectoryHandle)
            continue
          }
          if (handle?.kind === 'file') {
            const file = item.getAsFile()
            if (file) {
              files.push(file)
            }
            continue
          }
        } catch {
          // fall through to files list
        }
      }
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }
    if (directories.length > 0) {
      return { directories, files }
    }
  }
  if (dt.files?.length) {
    return { directories, files: [...dt.files] }
  }
  return { directories, files }
}

if (typeof window !== 'undefined') {
  if (import.meta.env.DEV) {
    void clearwasmcoepserviceworkers()
  } else {
    // Prod (GH Pages): establish isolation before the audio gesture so a
    // required COEP SW reload is not tied to "enable audio".
    void ensurewasmcoep()
  }

  window.addEventListener(
    'keydown',
    () => {
      enableaudio()
    },
    { capture: true },
  )

  window.addEventListener('click', () => {
    enableaudio()
  })

  window.addEventListener('dragover', (event) => {
    event.preventDefault()
  })

  window.addEventListener('contextmenu', (event) => {
    enableaudio()
    event.preventDefault()
  })

  window.addEventListener('paste', (event) => {
    if (!event.clipboardData?.files.length) {
      return
    }

    enableaudio()
    event.preventDefault()
    loadfiles([...event.clipboardData.files])
  })

  window.addEventListener('drop', (event) => {
    enableaudio()
    event.preventDefault()

    const dt = event.dataTransfer
    if (!dt) {
      return
    }
    void partitioncafedrop(dt).then(({ directories, files }) => {
      const player = registerreadplayer()
      for (let i = 0; i < directories.length; ++i) {
        registermemoryfsattach(SOFTWARE, player, directories[i])
      }
      if (files.length > 0) {
        loadfiles(files)
      }
    })
  })
}

// this will auto hide the mouse on idle
document.addEventListener('DOMContentLoaded', () => {
  let idleMouseTimer: ReturnType<typeof setTimeout>
  let forceMouseHide = false

  document.body.style.cursor = 'none'
  document.body.addEventListener('mousemove', () => {
    if (forceMouseHide) {
      return
    }

    document.body.style.cursor = ''
    clearTimeout(idleMouseTimer)

    idleMouseTimer = setTimeout(() => {
      document.body.style.cursor = 'none'
      forceMouseHide = true
      setTimeout(() => {
        forceMouseHide = false
      }, 200)
    }, 3000)
  })

  document.body.focus()
})

export function CafeApp() {
  const active = useDeviceData((state) => state.active)
  return active && <Engine />
}
