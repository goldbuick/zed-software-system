import { useEffect } from 'react'
import { vm_loadfile } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import 'zss/platform'

import { Terminal } from './terminal'

export function App() {
  useEffect(() => {
    function handlepaste(event: ClipboardEvent) {
      if (!event.clipboardData?.files.length) {
        return
      }

      // Prevent the default behavior, so you can code your own logic.
      event.preventDefault()

      // read files from clipboardData
      const files = [...event.clipboardData.files]
      files.forEach((file) =>
        vm_loadfile('loadfile', file, gadgetstategetplayer()),
      )
    }

    document.addEventListener('paste', handlepaste)
    return () => {
      document.removeEventListener('paste', handlepaste)
    }
  }, [])

  return <Terminal />
  // <Canvas
  //   style={{
  //     inset: 0,
  //     position: 'absolute',
  //     imageRendering: 'pixelated',
  //   }}
  //   onContextMenuCapture={(event) => {
  //     event.preventDefault()
  //   }}
  //   onDrop={(event) => {
  //     event.preventDefault()
  //     if (event.dataTransfer.items) {
  //       const items = [...event.dataTransfer.items]
  //       // Use DataTransferItemList interface to access the file(s)
  //       items.forEach((item) => {
  //         // If dropped items aren't files, reject them
  //         if (item.kind === 'file') {
  //           const file = item.getAsFile()
  //           if (ispresent(file)) {
  //             vm_loadfile('loadfile', file, gadgetstategetplayer())
  //           }
  //         }
  //       })
  //     } else {
  //       const files = [...event.dataTransfer.files]
  //       // Use DataTransfer interface to access the file(s)
  //       files.forEach((file) =>
  //         vm_loadfile('loadfile', file, gadgetstategetplayer()),
  //       )
  //     }
  //   }}
  //   onDragOver={(event) => {
  //     event.preventDefault()
  //   }}
  //   flat
  //   linear
  //   shadows={false}
  //   touch-action="none"
  //   gl={{
  //     alpha: false,
  //     stencil: false,
  //     antialias: false,
  //     precision: 'highp',
  //     preserveDrawingBuffer: true,
  //     powerPreference: 'high-performance',
  //   }}
  //   events={eventManagerFactory}
  //   onCreated={({ gl }) => {
  //     gl.localClippingEnabled = true
  //   }}
  // >
  //   <Terminal />
  // </Canvas>
}
