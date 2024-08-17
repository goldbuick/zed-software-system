import { Loader } from '@react-three/drei'
import { Canvas, events } from '@react-three/fiber'
import { Lethargy } from 'lethargy-ts'
import { useEffect } from 'react'
import useMeasure from 'react-use-measure'
import * as THREE from 'three'
import { vm_loadfile } from 'zss/device/api'
import { gadgetstategetplayer } from 'zss/device/gadgetclient'
import { makeEven } from 'zss/mapping/number'
import { ispresent } from 'zss/mapping/types'
import 'zss/platform'

import { Terminal } from './terminal'

const lethargy = new Lethargy()
const target = new THREE.Vector3()
const facing = new THREE.Vector3()

const eventManagerFactory: Parameters<typeof Canvas>[0]['events'] = (
  state,
) => ({
  // Default configuration
  ...events(state),

  // The filter can re-order or re-structure the intersections
  filter: (items: THREE.Intersection[]) => {
    const list = items.filter((item) => {
      if (!item.object.visible) {
        return false
      }

      const clippingPlanes: THREE.Plane[] =
        item.object.userData.clippingPlanes ?? []
      if (
        clippingPlanes.some((plane) => {
          plane.projectPoint(item.point, target)
          facing.subVectors(item.point, target).normalize().round()
          return plane.normal.equals(facing) === false
        })
      ) {
        return false
      }

      return true
    })

    const blockingIndex = list.findIndex(
      (item) => item.object.userData.blocking,
    )

    const result =
      blockingIndex === -1 ? list : list.slice(0, blockingIndex + 1)

    let cursor = 'default'
    result.some((item) => {
      if (item.object.userData.cursor) {
        cursor = item.object.userData.cursor
        return true
      }
      return false
    })

    document.querySelectorAll<HTMLElement>('html, body').forEach((node) => {
      node.style.cursor = cursor
    })

    return result
  },
})

export function App() {
  const [ref, bounds] = useMeasure()

  const boundsWidth = makeEven(bounds.width)
  const boundsHeight = makeEven(bounds.height)

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

    function handlemousewheel(event: WheelEvent) {
      if (!lethargy.check(event)) {
        return
      }
      console.info(event.deltaY)
    }

    document.addEventListener('paste', handlepaste, true)
    document.addEventListener('wheel', handlemousewheel, true)
    return () => {
      document.removeEventListener('paste', handlepaste, true)
      document.removeEventListener('wheel', handlemousewheel, true)
    }
  }, [])

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'absolute',
          inset: 0,
        }}
        onContextMenuCapture={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          if (event.dataTransfer.items) {
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
            const files = [...event.dataTransfer.files]
            // Use DataTransfer interface to access the file(s)
            files.forEach((file) =>
              vm_loadfile('loadfile', file, gadgetstategetplayer()),
            )
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
        }}
      >
        <div
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            margin: 'auto',
            width: boundsWidth,
            height: boundsHeight,
          }}
        >
          <Canvas
            flat
            linear
            dpr={1}
            shadows={false}
            touch-action="none"
            gl={{
              alpha: false,
              stencil: false,
              antialias: false,
              precision: 'highp',
              preserveDrawingBuffer: true,
              powerPreference: 'high-performance',
            }}
            style={{
              imageRendering: 'pixelated',
            }}
            events={eventManagerFactory}
            onCreated={({ gl }) => {
              gl.localClippingEnabled = true
            }}
          >
            <Terminal />
          </Canvas>
        </div>
      </div>
      <Loader />
    </>
  )
}
