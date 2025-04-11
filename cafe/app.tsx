import { extend } from '@react-three/fiber'
import {
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Points,
} from 'three'
import { vm_loader } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { enableaudio } from 'zss/device/synth'
import { Engine } from 'zss/gadget/engine'
import { ispresent } from 'zss/mapping/types'
import 'zss/platform'

extend({
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Points,
})

document.addEventListener('keydown', () => {
  enableaudio()
})

window.addEventListener('touchstart', () => {
  enableaudio()
})

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
    vm_loader(
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
          vm_loader(
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
      vm_loader(
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

export function App() {
  return <Engine />
}
