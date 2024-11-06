import { vm_loadfile } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { ispresent } from 'zss/mapping/types'

import 'zss/platform'

import { Terminal } from './terminal'

window.addEventListener('dragover', (event) => {
  event.preventDefault()
})

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

window.addEventListener('paste', (event) => {
  if (!event.clipboardData?.files.length) {
    return
  }

  // Prevent the default behavior, so you can code your own logic.
  event.preventDefault()

  // read files from clipboardData
  const files = [...event.clipboardData.files]
  files.forEach((file) => vm_loadfile('loadfile', file, gadgetstategetplayer()))
})

window.addEventListener('drop', (event) => {
  event.preventDefault()
  if (event.dataTransfer?.items) {
    const items = [...event.dataTransfer.items]
    // Use DataTransferItemList interface to access the file(s)
    items.forEach((item) => {
      // If dropped items aren't files, reject them
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (ispresent(file)) {
          vm_loadfile('loadfile', file, gadgetstategetplayer())
        }
      }
    })
  } else {
    // Use DataTransfer interface to access the file(s)
    const files = [...(event.dataTransfer?.files ?? [])]
    files.forEach((file) =>
      vm_loadfile('loadfile', file, gadgetstategetplayer()),
    )
  }
})

export function App() {
  return <Terminal />
}
