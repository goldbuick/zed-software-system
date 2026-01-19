import { vmloader } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { enableaudio } from 'zss/device/synth'
import { Engine } from 'zss/gadget/engine'
import { useDeviceData } from 'zss/gadget/hooks'
import { ispresent } from 'zss/mapping/types'
import { isfirefox } from 'zss/words/system'

if (!isfirefox) {
  window.addEventListener('keyup', () => {
    enableaudio()
  })
}

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

  if (event.dataTransfer?.items) {
    const items = [...event.dataTransfer.items]
    // Use DataTransferItemList interface to access the file(s)
    items.forEach((item) => {
      // If dropped items aren't files, reject them
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (ispresent(file)) {
          vmloader(
            SOFTWARE,
            registerreadplayer(),
            undefined,
            'file',
            file.name,
            file,
          )
        }
      }
    })
  } else {
    // Use DataTransfer interface to access the file(s)
    const files = [...(event.dataTransfer?.files ?? [])]
    files.forEach((file) =>
      vmloader(
        SOFTWARE,
        registerreadplayer(),
        undefined,
        'file',
        file.name,
        file,
      ),
    )
  }
})

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
})

export function App() {
  const active = useDeviceData((state) => state.active)
  return active && <Engine />
}
