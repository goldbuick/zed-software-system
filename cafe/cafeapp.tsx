import { apierror, vmloader } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import {
  applycafedroppartition,
  capturecafedropitems,
  resolvecafedropitems,
} from 'zss/device/wanixclient/wanixfsadropitems'
import { enableaudio } from 'zss/device/synth'
import { clearwasmcoepserviceworkers } from 'zss/feature/synth/backend/wasm/coopcoep'
import { useDeviceData } from 'zss/gadget/device'
import { Engine } from 'zss/gadget/engine'

if (typeof window !== 'undefined') {
  if (import.meta.env.DEV) {
    void clearwasmcoepserviceworkers()
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

    // Prevent the default behavior, so you can code your own logic.
    enableaudio()
    event.preventDefault()

    // read files from clipboardData
    const files = [...event.clipboardData.files]
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
  })

  window.addEventListener('drop', (event) => {
    enableaudio()
    event.preventDefault()

    const dt = event.dataTransfer
    if (!dt) {
      return
    }

    // Chrome: getAsFileSystemHandle must be invoked in this tick — no await before.
    const pending = capturecafedropitems(dt)
    void (async () => {
      try {
        const partition = await resolvecafedropitems(pending)
        await applycafedroppartition(partition, (file) => {
          vmloader(
            SOFTWARE,
            registerreadplayer(),
            undefined,
            'file',
            file.name,
            file,
          )
        })
      } catch (err) {
        apierror(
          SOFTWARE,
          registerreadplayer(),
          'wanix',
          err instanceof Error ? err.message : String(err),
        )
      }
    })()
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
