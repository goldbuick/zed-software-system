import { vmloader } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { enableaudio } from 'zss/device/synth'
import { clearwasmcoepserviceworkers } from 'zss/feature/synth/backend/wasm/coopcoep'
import { useDeviceData } from 'zss/gadget/device'
import { Engine } from 'zss/gadget/engine'
import { ispresent } from 'zss/mapping/types'

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

    const dropped: File[] = []
    if (dt.items?.length) {
      for (const item of [...dt.items]) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (ispresent(file)) {
            dropped.push(file)
          }
        }
      }
    }
    if (!dropped.length && dt.files?.length) {
      dropped.push(...dt.files)
    }
    for (const file of dropped) {
      vmloader(
        SOFTWARE,
        registerreadplayer(),
        undefined,
        'file',
        file.name,
        file,
      )
    }
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

export function App() {
  const active = useDeviceData((state) => state.active)
  return active && <Engine />
}
