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
import { vm_loadfile } from 'zss/device/api'
import { enableaudio } from 'zss/device/synth'
import { getgadgetclientplayer } from 'zss/gadget/data/state'
import { Terminal } from 'zss/gadget/terminal'
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
    vm_loadfile('loadfile', file, getgadgetclientplayer()),
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
          vm_loadfile('loadfile', file, getgadgetclientplayer())
        }
      }
    })
  } else {
    // Use DataTransfer interface to access the file(s)
    const files = [...(event.dataTransfer?.files ?? [])]
    files.forEach((file) =>
      vm_loadfile('loadfile', file, getgadgetclientplayer()),
    )
  }
})

export function App() {
  return <Terminal />
}